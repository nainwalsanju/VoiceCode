from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.routes import tts

logger = structlog.get_logger()

app = FastAPI(title="VoiceCode Backend")

app.include_router(tts.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "voicecode-backend"}


@app.get("/")
async def root():
    return {"message": "VoiceCode Backend API"}
