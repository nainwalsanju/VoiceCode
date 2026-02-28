import io
import structlog
from typing import Optional, AsyncGenerator

logger = structlog.get_logger()

# We support Pocket TTS (Kyutai) and Neutts Nano as requested by the user
AVAILABLE_VOICES = {
    "pocket": ["pocket-tts-en", "pocket-tts-hi"],
    "neutts": ["neutts-nano-en", "neutts-nano-hi"]
}

DEFAULT_VOICE = "neutts-nano-en"
DEFAULT_RATE = "1.0"
DEFAULT_PITCH = "0"
CHUNK_SIZE = 4096

class TTSService:
    def __init__(self):
        self._current_voice: Optional[str] = None
        self._neutts_model = None
        self._pocket_model = None

    def _load_model(self, voice: str):
        if self._current_voice == voice:
            return
            
        logger.info("loading_tts_model", voice=voice)
        
        # Stub implementation for loading models into CPU memory.
        # In actual deployment, this imports the specified local pip packages 
        # (e.g., `import neutts`) and loads the neural weights to CPU.
        if voice.startswith("neutts"):
            self._neutts_model = "Loaded Neutts Nano Model" 
            self._pocket_model = None
        elif voice.startswith("pocket"):
            self._pocket_model = "Loaded Pocket TTS Model"
            self._neutts_model = None
            
        self._current_voice = voice
        logger.info("tts_model_loaded", voice=voice)

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

        # Stub implementation for audio generation.
        # In a real environment, this calls the loaded model's CPU inference engine
        # to generate a raw PCM or WAV byte array.
        # Example: `audio_bytes = self._neutts_model.synthesize(text)`
        audio_buffer = io.BytesIO()
        
        # Simulating generated audio bytes
        dummy_audio = b"\x00\x01\x02" * min(len(text) * 100, 5000)
        audio_buffer.write(dummy_audio)

        audio_bytes = audio_buffer.getvalue()
        # Duration simulation based on standard 16kHz audio byte length
        duration_ms = int(len(audio_bytes) / 32) if audio_bytes else 0

        logger.info(
            "audio_generated", size_bytes=len(audio_bytes), duration_ms=duration_ms
        )
        return audio_bytes, duration_ms

    async def stream_audio_async(
        self,
        text: str,
        voice: str = DEFAULT_VOICE,
        rate: str = DEFAULT_RATE,
        pitch: str = DEFAULT_PITCH,
    ) -> AsyncGenerator[bytes, None]:
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        self._load_model(voice)
        logger.info("streaming_audio", text_length=len(text), voice=voice)

        # Stub implementation for streaming. Real implementation hooks into
        # the model's chunk-generation callbacks, yielding fast TTS chunks
        # to achieve sub-300ms Time-To-First-Audio on CPU.
        
        # Simulating chunked generation
        total_chunks = max(1, len(text) // 5)
        for _ in range(total_chunks):
            # Yield small chunks of simulated audio bytes
            yield b"\x00\x01\x02\x03" * 256
            
    def generate_audio(
        self, text: str, voice: str = DEFAULT_VOICE, speed: float = 1.0
    ) -> tuple[bytes, int]:
        # Sync version of generation if still needed by the backend
        raise NotImplementedError("Use generate_audio_async or stream_audio_async for the new CPU neural TTS engines.")

    def get_available_voices(self) -> dict[str, list[str]]:
        return AVAILABLE_VOICES.copy()

    def get_default_voice(self) -> str:
        return DEFAULT_VOICE


_tts_service: Optional[TTSService] = None

def get_tts_service() -> TTSService:
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
