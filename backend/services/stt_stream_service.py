import structlog
from typing import Optional
import asyncio
from faster_whisper import WhisperModel

logger = structlog.get_logger()

DEFAULT_MODEL = "base"
DEFAULT_DEVICE = "auto"

_stt_model: Optional[WhisperModel] = None
_current_model_name: Optional[str] = None


def get_model(model_name: str = DEFAULT_MODEL) -> WhisperModel:
    global _stt_model, _current_model_name

    if _stt_model is None or _current_model_name != model_name:
        logger.info("loading_whisper_model", model=model_name)
        compute_type = "int8"
        _stt_model = WhisperModel(
            model_name, device=DEFAULT_DEVICE, compute_type=compute_type
        )
        _current_model_name = model_name
        logger.info("whisper_model_loaded", model=model_name)

    return _stt_model


async def transcribe_stream(
    audio_chunk: bytes, model_name: str = DEFAULT_MODEL
) -> dict:
    model = get_model(model_name)

    try:
        segments, info = model.transcribe(
            audio_chunk,
            language=None,
            beam_size=5,
            vad_filter=True,
            word_timestamps=False,
        )

        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())

        full_text = " ".join(text_parts)

        return {"text": full_text, "language": info.language or "en", "is_final": True}
    except Exception as e:
        logger.error("transcription_error", error=str(e))
        return {"text": "", "language": "en", "error": str(e), "is_final": True}
