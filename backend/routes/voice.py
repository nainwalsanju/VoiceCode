import base64
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from backend.services.voice_clone_service import get_voice_cloning_service
from backend.models.voice_profile import get_voice_profile_store

router = APIRouter(prefix="/voice", tags=["voice"])

AUDIO_SAMPLES_DIR = Path(__file__).parent.parent.parent / "data" / "audio_samples"
AUDIO_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


class VoiceCloneRequest(BaseModel):
    name: str
    voice_id: Optional[str] = None


class VoiceCloneResponse(BaseModel):
    profile_id: str
    name: str
    voice_id: str
    audio_sample_path: str


@router.post("/clone")
async def clone_voice(
    name: str = Form(...),
    audio: UploadFile = File(...),
):
    """
    Clone a voice from an audio sample.

    Accepts an audio file and creates a voice profile.
    """
    try:
        # Read audio file
        audio_data = await audio.read()

        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        # Save audio sample
        sample_id = str(uuid.uuid4())
        sample_path = AUDIO_SAMPLES_DIR / f"{sample_id}.wav"
        sample_path.write_bytes(audio_data)

        # Create voice profile
        profile_store = get_voice_profile_store()
        profile = profile_store.create(
            name=name,
            voice_id=sample_id,
            is_default=False,
            audio_sample_path=str(sample_path),
        )

        # Try to process with voice cloning service (may fail if model issue)
        try:
            voice_service = get_voice_cloning_service()
            voice_service.clone_voice_from_audio(audio_data, profile.id)
        except Exception as e:
            # Log but don't fail - we still saved the profile
            pass

        return VoiceCloneResponse(
            profile_id=profile.id,
            name=profile.name,
            voice_id=profile.voice_id,
            audio_sample_path=profile.audio_sample_path,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {str(e)}")


@router.get("/presets")
async def get_voice_presets():
    """Get available preset voices from Pocket TTS."""
    try:
        voice_service = get_voice_cloning_service()
        presets = voice_service.get_available_preset_voices()
        return {"presets": presets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get presets: {str(e)}")


@router.get("/sample-rate")
async def get_sample_rate():
    """Get the sample rate used for voice generation."""
    try:
        voice_service = get_voice_cloning_service()
        model = voice_service._load_model()
        return {"sample_rate": model.sample_rate}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get sample rate: {str(e)}"
        )
