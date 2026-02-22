import structlog
from typing import Optional
from faster_whisper import WhisperModel

logger = structlog.get_logger()

AVAILABLE_MODELS = ["tiny", "base", "small", "medium", "large-v2", "large-v3"]
DEFAULT_MODEL = "base"
DEFAULT_DEVICE = "auto"


class STTService:
    def __init__(self):
        self._model: Optional[WhisperModel] = None
        self._current_model_name: Optional[str] = None

    def load_model(
        self, model_name: str = DEFAULT_MODEL, device: str = DEFAULT_DEVICE
    ) -> None:
        if self._model is not None and self._current_model_name == model_name:
            return

        logger.info("loading_whisper_model", model=model_name, device=device)

        compute_type = "float16" if device == "cuda" else "int8"
        self._model = WhisperModel(model_name, device=device, compute_type=compute_type)
        self._current_model_name = model_name

        logger.info("whisper_model_loaded", model=model_name)

    def transcribe(
        self,
        audio_data: bytes,
        language: Optional[str] = None,
        model_name: str = DEFAULT_MODEL,
    ) -> dict:
        self.load_model(model_name)

        logger.info("transcribing_audio", language=language)

        segments, info = self._model.transcribe(
            audio_data, language=language, beam_size=5, vad_filter=True
        )

        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())

        full_text = " ".join(text_parts)

        result = {
            "text": full_text,
            "language": info.language if info.language else "en",
            "language_probability": float(info.language_probability)
            if info.language_probability
            else 0.0,
            "duration": float(info.duration) if info.duration else 0.0,
        }

        logger.info("transcription_complete", text_length=len(full_text))
        return result

    def get_available_models(self) -> list[str]:
        return AVAILABLE_MODELS.copy()


_stt_service: Optional[STTService] = None


def get_stt_service() -> STTService:
    global _stt_service
    if _stt_service is None:
        _stt_service = STTService()
    return _stt_service
