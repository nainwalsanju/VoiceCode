import base64
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio

from backend.services.tts_service import get_tts_service, DEFAULT_VOICE

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE
    speed: float = 1.0


class TTSGenerateResponse(BaseModel):
    audio_base64: str
    duration_ms: int


@router.post("/generate", response_model=TTSGenerateResponse)
async def generate_tts(request: TTSRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        tts_service = get_tts_service()
        rate = (
            "+0%" if request.speed == 1.0 else f"{int((request.speed - 1.0) * 100):+d}%"
        )
        audio_bytes, duration_ms = await tts_service.generate_audio_async(
            text=request.text, voice=request.voice, rate=rate
        )

        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        return TTSGenerateResponse(audio_base64=audio_base64, duration_ms=duration_ms)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


async def audio_stream_generator(text: str, voice: str, rate: str):
    tts_service = get_tts_service()
    async for chunk in tts_service.stream_audio_async(text, voice, rate):
        yield chunk
        await asyncio.sleep(0.01)


@router.post("/stream")
async def stream_tts(request: TTSRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        rate = (
            "+0%" if request.speed == 1.0 else f"{int((request.speed - 1.0) * 100):+d}%"
        )

        return StreamingResponse(
            audio_stream_generator(request.text, request.voice, rate),
            media_type="audio/mpeg",
            headers={"Accept-Ranges": "none", "Content-Disposition": "inline"},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS streaming failed: {str(e)}")


@router.get("/voices")
async def get_voices():
    tts_service = get_tts_service()
    return {"voices": tts_service.get_available_voices()}
