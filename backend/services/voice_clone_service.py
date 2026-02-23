import io
import json
import structlog
from pathlib import Path
from typing import Optional
import numpy as np
import scipy.io.wavfile as wavfile

logger = structlog.get_logger()

VOICE_STATES_DIR = Path(__file__).parent.parent.parent / "data" / "voice_states"
VOICE_STATES_DIR.mkdir(parents=True, exist_ok=True)

AVAILABLE_PRESET_VOICES = [
    "alba",
    "marius",
    "javert",
    "jean",
    "fantine",
    "cosette",
    "eponine",
    "azelma",
]


class VoiceCloningService:
    def __init__(self):
        self._model = None
        self._voice_states: dict[str, any] = {}

    def _load_model(self):
        if self._model is None:
            from pocket_tts import TTSModel

            logger.info("loading_pocket_tts_model")
            self._model = TTSModel.load_model()
            logger.info("pocket_tts_model_loaded", sample_rate=self._model.sample_rate)
        return self._model

    def get_voice_state(self, voice_source: str) -> tuple[any, str]:
        """
        Get voice state from a preset voice name or audio file.

        Args:
            voice_source: Either a preset voice name (e.g., "alba") or path to audio file

        Returns:
            Tuple of (voice_state, voice_type)
        """
        model = self._load_model()

        # Check if it's a preset voice
        if voice_source in AVAILABLE_PRESET_VOICES:
            if voice_source not in self._voice_states:
                logger.info("loading_preset_voice", voice=voice_source)
                self._voice_states[voice_source] = model.get_state_for_audio_prompt(
                    voice_source
                )
            return self._voice_states[voice_source], "preset"

        # Check if it's a file path we already processed
        if voice_source in self._voice_states:
            return self._voice_states[voice_source], "cloned"

        # Assume it's an audio file path for voice cloning
        voice_path = Path(voice_source)
        if voice_path.exists():
            logger.info("processing_voice_clone", path=str(voice_path))
            voice_state = model.get_state_for_audio_prompt(str(voice_path))
            self._voice_states[voice_source] = voice_state
            return voice_state, "cloned"

        raise ValueError(f"Unknown voice source: {voice_source}")

    def clone_voice_from_audio(self, audio_data: bytes, profile_id: str) -> str:
        """
        Clone voice from audio data and save the voice state.

        Args:
            audio_data: Raw audio bytes (WAV format)
            profile_id: ID of the voice profile

        Returns:
            Path to saved voice state file
        """
        model = self._load_model()

        # Write audio to temporary file
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            # Get voice state from audio
            voice_state = model.get_state_for_audio_prompt(tmp_path)

            # Save voice state
            voice_state_path = VOICE_STATES_DIR / f"{profile_id}.json"

            # Convert voice state to serializable format
            state_data = {
                "profile_id": profile_id,
                "audio_source": tmp_path,
                # Voice state is typically a tensor or complex object
                # For Pocket TTS, we need to serialize appropriately
            }

            # Actually, Pocket TTS voice states are not directly serializable
            # We should save the reference and keep state in memory
            # Let's store a reference file
            ref_data = {
                "profile_id": profile_id,
                "audio_source": tmp_path,
                "is_cloned": True,
            }
            voice_state_path.write_text(json.dumps(ref_data))

            # Keep in memory
            self._voice_states[profile_id] = voice_state

            logger.info(
                "voice_cloned", profile_id=profile_id, path=str(voice_state_path)
            )
            return str(voice_state_path)

        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)

    def generate_audio(
        self,
        text: str,
        voice_source: str,
    ) -> tuple[bytes, int]:
        """
        Generate audio using cloned voice.

        Args:
            text: Text to synthesize
            voice_source: Either preset voice or profile ID for cloned voice

        Returns:
            Tuple of (audio_bytes, duration_ms)
        """
        model = self._load_model()
        voice_state, voice_type = self.get_voice_state(voice_source)

        logger.info(
            "generating_with_cloned_voice", text_length=len(text), voice_type=voice_type
        )

        audio = model.generate_audio(voice_state, text)

        # Convert to bytes
        audio_bytes = wavfile.write(io.BytesIO(), model.sample_rate, audio.numpy())

        # Get proper bytes
        buffer = io.BytesIO()
        wavfile.write(buffer, model.sample_rate, audio.numpy())
        audio_bytes = buffer.getvalue()

        duration_ms = int(len(audio_bytes) / model.sample_rate * 1000)

        logger.info(
            "cloned_voice_audio_generated",
            size_bytes=len(audio_bytes),
            duration_ms=duration_ms,
        )
        return audio_bytes, duration_ms

    def get_available_preset_voices(self) -> list[str]:
        return AVAILABLE_PRESET_VOICES.copy()


_voice_cloning_service: Optional[VoiceCloningService] = None


def get_voice_cloning_service() -> VoiceCloningService:
    global _voice_cloning_service
    if _voice_cloning_service is None:
        _voice_cloning_service = VoiceCloningService()
    return _voice_cloning_service
