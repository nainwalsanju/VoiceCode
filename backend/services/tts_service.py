import io
import base64
import structlog
from typing import Optional, AsyncGenerator
import asyncio
import edge_tts

logger = structlog.get_logger()

AVAILABLE_VOICES = {
    "en-US": [
        "en-US-AriaNeural",
        "en-US-GuyNeural",
        "en-US-JennyNeural",
        "en-US-SaraNeural",
    ],
    "en-GB": [
        "en-GB-SoniaNeural",
        "en-GB-RyanNeural",
    ],
    "es-ES": [
        "es-ES-ElviraNeural",
        "es-ES-AlvaroNeural",
    ],
    "fr-FR": [
        "fr-FR-DeniseNeural",
        "fr-FR-HenriNeural",
    ],
    "de-DE": [
        "de-DE-KatjaNeural",
        "de-DE-ConradNeural",
    ],
}

DEFAULT_VOICE = "en-US-AriaNeural"
DEFAULT_RATE = "+0%"
DEFAULT_PITCH = "+0Hz"
CHUNK_SIZE = 4096


class TTSService:
    def __init__(self):
        self._current_voice: Optional[str] = None

    async def generate_audio_async(
        self,
        text: str,
        voice: str = DEFAULT_VOICE,
        rate: str = DEFAULT_RATE,
        pitch: str = DEFAULT_PITCH,
    ) -> tuple[bytes, int]:
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        logger.info("generating_audio", text_length=len(text), voice=voice)

        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)

        audio_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])

        audio_bytes = audio_buffer.getvalue()
        duration_ms = int(len(audio_bytes) / 2000 * 1000) if audio_bytes else 0

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

        logger.info("streaming_audio", text_length=len(text), voice=voice)

        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    def generate_audio(
        self, text: str, voice: str = DEFAULT_VOICE, speed: float = 1.0
    ) -> tuple[bytes, int]:
        if speed != 1.0:
            rate_value = int((speed - 1.0) * 100)
            rate = f"{rate_value:+d}%"
        else:
            rate = DEFAULT_RATE

        try:
            loop = asyncio.get_running_loop()
            raise RuntimeError("Cannot use sync generate_audio in async context")
        except RuntimeError:
            return asyncio.run(
                self.generate_audio_async(text, voice, rate, DEFAULT_PITCH)
            )

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
