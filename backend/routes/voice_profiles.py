from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.models.voice_profile import get_voice_profile_store

router = APIRouter(prefix="/voice-profiles", tags=["voice-profiles"])


class VoiceProfileCreate(BaseModel):
    name: str
    voice_id: str
    is_default: bool = False
    audio_sample_path: Optional[str] = None


class VoiceProfileUpdate(BaseModel):
    name: Optional[str] = None
    voice_id: Optional[str] = None
    is_default: Optional[bool] = None
    audio_sample_path: Optional[str] = None


class VoiceProfileResponse(BaseModel):
    id: str
    name: str
    voice_id: str
    is_default: bool
    created_at: str
    audio_sample_path: Optional[str] = None


def _to_response(profile) -> VoiceProfileResponse:
    return VoiceProfileResponse(
        id=profile.id,
        name=profile.name,
        voice_id=profile.voice_id,
        is_default=profile.is_default,
        created_at=profile.created_at,
        audio_sample_path=profile.audio_sample_path,
    )


@router.get("", response_model=list[VoiceProfileResponse])
async def list_voice_profiles():
    store = get_voice_profile_store()
    profiles = store.list_all()
    return [_to_response(p) for p in profiles]


@router.post("", response_model=VoiceProfileResponse)
async def create_voice_profile(profile_data: VoiceProfileCreate):
    store = get_voice_profile_store()
    profile = store.create(
        name=profile_data.name,
        voice_id=profile_data.voice_id,
        is_default=profile_data.is_default,
        audio_sample_path=profile_data.audio_sample_path,
    )
    return _to_response(profile)


@router.get("/{profile_id}", response_model=VoiceProfileResponse)
async def get_voice_profile(profile_id: str):
    store = get_voice_profile_store()
    profile = store.get_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return _to_response(profile)


@router.put("/{profile_id}", response_model=VoiceProfileResponse)
async def update_voice_profile(profile_id: str, profile_data: VoiceProfileUpdate):
    store = get_voice_profile_store()
    profile = store.update(
        profile_id=profile_id,
        name=profile_data.name,
        voice_id=profile_data.voice_id,
        is_default=profile_data.is_default,
        audio_sample_path=profile_data.audio_sample_path,
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return _to_response(profile)


@router.delete("/{profile_id}")
async def delete_voice_profile(profile_id: str):
    store = get_voice_profile_store()
    success = store.delete(profile_id)
    if not success:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return {"status": "deleted", "id": profile_id}


@router.get("/default", response_model=VoiceProfileResponse)
async def get_default_voice_profile():
    store = get_voice_profile_store()
    profile = store.get_default()
    if not profile:
        raise HTTPException(status_code=404, detail="No voice profiles found")
    return _to_response(profile)
