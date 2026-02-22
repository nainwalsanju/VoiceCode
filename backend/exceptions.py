from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from typing import Optional


class VoiceCodeException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class TTSGenerationError(VoiceCodeException):
    def __init__(self, message: str = "TTS generation failed"):
        super().__init__(message, status_code=500)


class STTTranscriptionError(VoiceCodeException):
    def __init__(self, message: str = "STT transcription failed"):
        super().__init__(message, status_code=500)


class VoiceCloneError(VoiceCodeException):
    def __init__(self, message: str = "Voice cloning failed"):
        super().__init__(message, status_code=500)


async def voicecode_exception_handler(request: Request, exc: VoiceCodeException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "type": exc.__class__.__name__},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )
