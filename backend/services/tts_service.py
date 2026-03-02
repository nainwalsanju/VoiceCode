import io
import structlog
import time
from typing import Optional, AsyncGenerator
from dataclasses import dataclass
import numpy as np

logger = structlog.get_logger()

AVAILABLE_VOICES = {
    "qwen3": ["qwen3-tts-0.6b", "qwen3-tts-1.7b"],
    "neutts-air": ["neutts-air-en", "neutts-air-multi"],
    "neutts-nano": ["neutts-nano-en", "neutts-nano-hi"],
    "pocket": ["pocket-tts-en", "pocket-tts-hi"],
    "kokoro": ["kokoro-zh", "kokoro-en"],
    "edge": ["en-US-AriaNeural", "en-US-GuyNeural", "en-GB-SoniaNeural"],
}

DEFAULT_VOICE = "qwen3-tts-0.6b"
DEFAULT_RATE = "1.0"
DEFAULT_PITCH = "0"
CHUNK_SIZE = 4096

# Latency targets per engine (in ms)
ENGINE_LATENCY_TARGETS = {
    "qwen3": 97,       # 97ms target
    "neutts-air": 50,   # Real-time
    "neutts-nano": 100, # Edge device
    "pocket": 200,     # ~200ms
    "kokoro": 100,     # ~100ms
    "edge": 300,       # Network-based
}


@dataclass
class TTSStreamResult:
    """Result from TTS streaming with metadata."""
    audio_chunk: bytes
    is_first_chunk: bool
    latency_ms: float
    chunk_index: int


class TTSService:
    def __init__(self):
        self._current_voice: Optional[str] = None
        self._qwen3_model = None
        self._neutts_air_model = None
        self._neutts_nano_model = None
        self._pocket_model = None
        self._kokoro_model = None
        self._edge_model = None
        
        # Latency tracking
        self._last_generation_time = 0.0
        self._first_chunk_latency: Optional[float] = None
        
        # Model configs
        self._qwen_config = {}
        self._kokoro_voices = {}

    def _load_model(self, voice: str):
        if self._current_voice == voice:
            return
            
        logger.info("loading_tts_model", voice=voice)
        
        try:
            if voice.startswith("qwen3"):
                self._load_qwen3(voice)
            elif voice.startswith("neutts-air"):
                self._load_neutts_air(voice)
            elif voice.startswith("neutts-nano"):
                self._load_neutts_nano(voice)
            elif voice.startswith("pocket"):
                self._load_pocket(voice)
            elif voice.startswith("kokoro"):
                self._load_kokoro(voice)
            elif voice.startswith("edge"):
                self._load_edge(voice)
            else:
                logger.warning("unknown_voice_type", voice=voice)
        except ImportError as e:
            logger.warning("tts_model_import_error", voice=voice, error=str(e))
        except Exception as e:
            logger.error("tts_model_load_error", voice=voice, error=str(e))
            
        self._current_voice = voice
        logger.info("tts_model_loaded", voice=voice)

    def _load_qwen3(self, voice: str):
        try:
            from qwen_tts import QwenTTS
            model_size = "0.6b" if "0.6b" in voice else "1.7b"
            self._qwen3_model = QwenTTS(model_size=model_size)
            logger.info("qwen3_tts_loaded", size=model_size)
        except ImportError:
            logger.warning("qwen3_tts_not_installed")
            self._qwen3_model = None

    def _load_neutts_air(self, voice: str):
        try:
            from neursson import NeurSS
            self._neutts_air_model = NeurSS(model_type="air")
            logger.info("neutts_air_loaded")
        except ImportError:
            logger.warning("neutts_air_not_installed")
            self._neutts_air_model = None

    def _load_neutts_nano(self, voice: str):
        try:
            from neursson import NeurSS
            self._neutts_nano_model = NeurSS(model_type="nano")
            logger.info("neutts_nano_loaded")
        except ImportError:
            logger.warning("neutts_nano_not_installed")
            self._neutts_nano_model = None

    def _load_pocket(self, voice: str):
        try:
            from pocket_tts import PocketTTS
            self._pocket_model = PocketTTS()
            logger.info("pocket_tts_loaded")
        except ImportError:
            logger.warning("pocket_tts_not_installed")
            self._pocket_model = None

    def _load_kokoro(self, voice: str):
        try:
            from kokoro import KModel
            self._kokoro_model = KModel()
            logger.info("kokoro_loaded")
        except ImportError:
            logger.warning("kokoro_not_installed")
            self._kokoro_model = None

    def _load_edge(self, voice: str):
        import edge_tts
        self._edge_model = voice
        logger.info("edge_tts_loaded", voice=voice)

    async def generate_audio_async(
        self,
        text: str,
        voice: str = DEFAULT_VOICE,
        rate: str = DEFAULT_RATE,
        pitch: str = DEFAULT_PITCH,
    ) -> tuple[bytes, int]:
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        self._load_model(voice)
        logger.info("generating_audio", text_length=len(text), voice=voice)

        audio_bytes = b""
        
        try:
            if self._qwen3_model:
                audio = self._qwen3_model.generate(text)
                audio_bytes = self._audio_to_bytes(audio)
            elif self._pocket_model:
                audio = self._pocket_model.generate(text)
                audio_bytes = self._audio_to_bytes(audio)
            elif self._kokoro_model:
                audio = self._kokoro_model.generate(text)
                audio_bytes = self._audio_to_bytes(audio)
            elif self._edge_model:
                import edge_tts
                communicate = edge_tts.Communicate(text, self._edge_model)
                audio_bytes = b""
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_bytes += chunk["data"]
            else:
                audio_bytes = self._generate_silence(len(text))
        except Exception as e:
            logger.error("tts_generation_error", error=str(e))
            audio_bytes = self._generate_silence(len(text))

        duration_ms = int(len(audio_bytes) / 32) if audio_bytes else 0
        logger.info("audio_generated", size_bytes=len(audio_bytes), duration_ms=duration_ms)
        return audio_bytes, duration_ms

    async def stream_audio_async(
        self,
        text: str,
        voice: str = DEFAULT_VOICE,
        rate: str = DEFAULT_RATE,
        pitch: str = DEFAULT_PITCH,
    ) -> AsyncGenerator[bytes, None]:
        """Stream audio with latency tracking for first chunk."""
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        self._load_model(voice)
        # Track first chunk latency
        start_time = time.perf_counter()
        first_chunk_sent = False
        
        logger.info("streaming_audio", text_length=len(text), voice=voice)

        try:
            if self._edge_model:
                import edge_tts
                communicate = edge_tts.Communicate(text, self._edge_model)
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        chunk_latency = (time.perf_counter() - start_time) * 1000
                        if not first_chunk_sent:
                            self._first_chunk_latency = chunk_latency
                            first_chunk_sent = True
                            logger.info("tts_first_chunk_latency", ms=chunk_latency)
                        yield chunk["data"]
                        
            elif self._qwen3_model:
                # Qwen3 TTS streaming
                for chunk in self._qwen3_model.stream_generate(text):
                    audio_chunk = self._audio_to_bytes(chunk)
                    if audio_chunk:
                        chunk_latency = (time.perf_counter() - start_time) * 1000
                        if not first_chunk_sent:
                            self._first_chunk_latency = chunk_latency
                            first_chunk_sent = True
                            logger.info("tts_first_chunk_latency", ms=chunk_latency)
                        yield audio_chunk
                        
            elif self._neutts_air_model:
                # NeuTTS Air streaming - instant voice clone
                for audio_chunk in self._neutts_air_model.stream_speak(text):
                    chunk_latency = (time.perf_counter() - start_time) * 1000
                    if not first_chunk_sent:
                        self._first_chunk_latency = chunk_latency
                        first_chunk_sent = True
                        logger.info("tts_first_chunk_latency", ms=chunk_latency)
                    yield self._audio_to_bytes(audio_chunk)
                    
            elif self._neutts_nano_model:
                # NeuTTS Nano streaming - edge optimized
                for audio_chunk in self._neutts_nano_model.stream_speak(text):
                    chunk_latency = (time.perf_counter() - start_time) * 1000
                    if not first_chunk_sent:
                        self._first_chunk_latency = chunk_latency
                        first_chunk_sent = True
                        logger.info("tts_first_chunk_latency", ms=chunk_latency)
                    yield self._audio_to_bytes(audio_chunk)
                    
            elif self._pocket_model:
                # PocketTTS streaming
                for chunk in self._pocket_model.stream_generate(text):
                    audio_chunk = self._audio_to_bytes(chunk)
                    if audio_chunk:
                        chunk_latency = (time.perf_counter() - start_time) * 1000
                        if not first_chunk_sent:
                            self._first_chunk_latency = chunk_latency
                            first_chunk_sent = True
                            logger.info("tts_first_chunk_latency", ms=chunk_latency)
                        yield audio_chunk
                        
            elif self._kokoro_model:
                # Kokoro streaming
                voice_map = self._get_kokoro_voice(voice)
                for audio_chunk in self._kokoro_model.stream_speak(text, voice=voice_map):
                    chunk_latency = (time.perf_counter() - start_time) * 1000
                    if not first_chunk_sent:
                        self._first_chunk_latency = chunk_latency
                        first_chunk_sent = True
                        logger.info("tts_first_chunk_latency", ms=chunk_latency)
                    yield self._audio_to_bytes(audio_chunk)
            else:
                # Fallback: generate placeholder chunks
                for i in range(max(1, len(text) // 10)):
                    chunk_latency = (time.perf_counter() - start_time) * 1000
                    if not first_chunk_sent:
                        self._first_chunk_latency = chunk_latency
                        first_chunk_sent = True
                    yield self._generate_chunk(512)
                    
        except Exception as e:
            logger.error("tts_stream_error", error=str(e))
            yield self._generate_chunk(512)
        
        self._last_generation_time = time.perf_counter()

    def _get_kokoro_voice(self, voice: str) -> str:
        """Map voice name to Kokoro voice pack."""
        voice_map = {
            "kokoro-en": "af_sarah",
            "kokoro-zh": "zf_xiaoxiao",
        }
        return voice_map.get(voice, "af_sarah")

    def _audio_to_bytes(self, audio) -> bytes:
        if audio is None:
            return b""
        if isinstance(audio, bytes):
            return audio
        if isinstance(audio, np.ndarray):
            import scipy.io.wavfile as wavfile
            buffer = io.BytesIO()
            sample_rate = getattr(audio, 'sr', 24000)
            wavfile.write(buffer, sample_rate, audio)
            return buffer.getvalue()
        return b""

    def _generate_silence(self, text_length: int) -> bytes:
        duration_sec = min(text_length / 15, 10)
        sample_rate = 24000
        samples = int(duration_sec * sample_rate)
        silence = np.zeros(samples, dtype=np.int16)
        import scipy.io.wavfile as wavfile
        buffer = io.BytesIO()
        wavfile.write(buffer, sample_rate, silence)
        return buffer.getvalue()

    def _generate_chunk(self, size: int) -> bytes:
        sample_rate = 24000
        chunk_samples = int(size * sample_rate / 1000)
        audio = np.zeros(chunk_samples, dtype=np.int16)
        import scipy.io.wavfile as wavfile
        buffer = io.BytesIO()
        wavfile.write(buffer, sample_rate, audio)
        return buffer.getvalue()

    def generate_audio(
        self, text: str, voice: str = DEFAULT_VOICE, speed: float = 1.0
    ) -> tuple[bytes, int]:
        raise NotImplementedError("Use generate_audio_async or stream_audio_async")

    def get_available_voices(self) -> dict[str, list[str]]:
        return AVAILABLE_VOICES.copy()

    def get_default_voice(self) -> str:
        return DEFAULT_VOICE

    def get_first_chunk_latency(self) -> Optional[float]:
        """Get the latency to first audio chunk in ms."""
        return self._first_chunk_latency

    def get_engine_latency_target(self, voice: str) -> int:
        """Get the target latency for the given engine."""
        for engine, target in ENGINE_LATENCY_TARGETS.items():
            if voice.startswith(engine):
                return target
        return 250  # Default target

    def reset_latency_tracking(self):
        """Reset latency tracking for new synthesis."""
        self._first_chunk_latency = None
        self._last_generation_time = 0.0


_tts_service: Optional[TTSService] = None

def get_tts_service() -> TTSService:
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
