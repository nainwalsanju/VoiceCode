from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import structlog
import sys
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.routes import tts, stt, stt_stream, voice_profiles, voice, commands, settings, app_state, agent_stream, agents
from backend.utils.logging import setup_logging
from backend.exceptions import (
    VoiceCodeException,
    voicecode_exception_handler,
    generic_exception_handler,
)

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("voicecode-backend-started")
    yield
    logger.info("voicecode-backend-shutdown")


app = FastAPI(title="VoiceCode Backend", lifespan=lifespan)

app.include_router(tts.router)
app.include_router(stt.router)
app.include_router(stt_stream.router)
app.include_router(voice_profiles.router)
app.include_router(voice.router)
app.include_router(commands.router)
app.include_router(settings.router)
app.include_router(app_state.router)
app.include_router(agent_stream.router)
app.include_router(agents.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://localhost:1421",
        "http://localhost:3000",
        "ws://localhost:3000",
        "ws://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    logger.info(
        "request-started",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )
    response = await call_next(request)
    logger.info(
        "request-completed", request_id=request_id, status_code=response.status_code
    )
    response.headers["X-Request-ID"] = request_id
    return response


app.add_exception_handler(VoiceCodeException, voicecode_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "voicecode-backend"}


@app.get("/")
async def root():
    return {"message": "VoiceCode Backend API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
