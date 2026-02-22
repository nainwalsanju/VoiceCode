from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional

from backend.services.stt_service import get_stt_service, DEFAULT_MODEL

router = APIRouter(prefix="/stt", tags=["stt"])


class TranscribeResponse(BaseModel):
    text: str
    language: str
    language_probability: float
    duration: float


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    model: str = DEFAULT_MODEL,
):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file provided")

    try:
        audio_bytes = await file.read()

        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        stt_service = get_stt_service()
        result = stt_service.transcribe(
            audio_data=audio_bytes, language=language, model_name=model
        )

        return TranscribeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.get("/models")
async def get_models():
    stt_service = get_stt_service()
    return {"models": stt_service.get_available_models()}
