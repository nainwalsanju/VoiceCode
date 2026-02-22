from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    speed: float = 1.0


class TTSGenerateResponse(BaseModel):
    audio_base64: str
    duration_ms: int


@router.post("/generate", response_model=TTSGenerateResponse)
async def generate_tts(request: TTSRequest):
    raise HTTPException(status_code=501, detail="TTS generation not yet implemented")


@router.post("/stream")
async def stream_tts(request: TTSRequest):
    raise HTTPException(status_code=501, detail="TTS streaming not yet implemented")
