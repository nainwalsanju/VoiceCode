import structlog
from typing import Optional
from faster_whisper import WhisperModel

logger = structlog.get_logger()

# We support Moonshine (for extreme CPU speed) and Faster-Whisper (for Shunyalabs Hinglish accuracy)
AVAILABLE_MODELS = ["moonshine/tiny", "moonshine/base", "shunyalabs/zero-stt-hinglish", "tiny", "base", "small"]
DEFAULT_MODEL = "moonshine/tiny"
DEFAULT_DEVICE = "cpu"


class STTService:
    def __init__(self):
        self._fw_model: Optional[WhisperModel] = None
        self._moonshine_model = None
        self._current_model_name: Optional[str] = None

    def load_model(
        self, model_name: str = DEFAULT_MODEL, device: str = DEFAULT_DEVICE
    ) -> None:
        if self._current_model_name == model_name:
            return

        logger.info("loading_stt_model", model=model_name, device=device)

        if model_name.startswith("moonshine"):
            # Load Moonshine Model
            ms_name = model_name.split("/")[1]  # "tiny" or "base"
            self._moonshine_model = moonshine.load(ms_name)
            self._fw_model = None
        else:
            # Load Faster-Whisper Model (e.g. shunyalabs/zero-stt-hinglish)
            compute_type = "float16" if device == "cuda" else "int8"
            self._fw_model = WhisperModel(model_name, device=device, compute_type=compute_type)
            self._moonshine_model = None

        self._current_model_name = model_name
        logger.info("stt_model_loaded", model=model_name)

    def transcribe(
        self,
        audio_data: bytes, # We assume here it's 16kHz raw PCM or manageable bytes for the model
        language: Optional[str] = None,
        model_name: str = DEFAULT_MODEL,
    ) -> dict:
        self.load_model(model_name)

        logger.info("transcribing_audio", model=self._current_model_name)
        full_text = ""
        info_lang = "en"

        if self._moonshine_model:
            # Moonshine transcription 
            # Note: moonshine typically expects a numpy array of shape (seq_len,) or similar at 16kHz
            # For simplicity in this drop-in replacement, we assume upstream handles decoding to proper format if needed,
            # or we pass the bytes directly if supported by the moonshine wrapper. 
            # *In a real implementation, you'd decode bytes to float32 numpy array here.*
            # Example assuming `audio_data` is already a preprocessed array or supported type:
            try:
                # Actual moonshine implementation requires proper audio preprocessing
                # This is a stub for the integration point
                full_text = self._moonshine_model.transcribe(audio_data) 
            except Exception as e:
                logger.error("moonshine_transcribe_error", error=str(e))
                full_text = ""
        elif self._fw_model:
            # Faster-Whisper transcription
            segments, info = self._fw_model.transcribe(
                audio_data, language=language, beam_size=5, vad_filter=True
            )
            text_parts = [segment.text.strip() for segment in segments]
            full_text = " ".join(text_parts)
            if info:
                info_lang = info.language

        result = {
            "text": full_text,
            "language": info_lang,
            "duration": 0.0, # duration info depends on audio decoding
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
