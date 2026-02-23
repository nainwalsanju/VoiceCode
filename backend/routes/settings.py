from fastapi import APIRouter, HTTPException
import json
import subprocess
import platform
from typing import Optional

from backend.models.settings import get_settings_store, AppSettings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_settings() -> dict:
    store = get_settings_store()
    return store.get().to_dict()


@router.put("")
async def update_settings(settings: dict) -> dict:
    store = get_settings_store()
    updated = store.update(settings)
    return updated.to_dict()


@router.get("/microphones")
async def get_microphones() -> list[dict]:
    system = platform.system()

    microphones = []

    try:
        if system == "Darwin":
            result = subprocess.run(
                [
                    "python3",
                    "-c",
                    "import sounddevice as sd; print([{'id': i['name'], 'name': i['name']} for i in sd.query_devices() if i['max_input_channels'] > 0])",
                ],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0 and result.stdout.strip():
                microphones = json.loads(result.stdout.strip())
        elif system == "Windows":
            result = subprocess.run(
                [
                    "python3",
                    "-c",
                    "import sounddevice as sd; print([{'id': i['name'], 'name': i['name']} for i in sd.query_devices() if i['max_input_channels'] > 0])",
                ],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0 and result.stdout.strip():
                microphones = json.loads(result.stdout.strip())
    except Exception:
        microphones = [
            {"id": "default", "name": "Default Microphone"},
            {"id": "system_default", "name": "System Default"},
        ]

    if not microphones:
        microphones = [
            {"id": "default", "name": "Default Microphone"},
        ]

    return microphones


@router.get("/voices")
async def get_tts_voices() -> list[dict]:
    store = get_settings_store()
    settings = store.get()

    voices = []

    try:
        if platform.system() == "Darwin":
            result = subprocess.run(
                ["say", "-v", "?"], capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split("\n"):
                    if line.strip():
                        parts = line.split()
                        if parts:
                            voice_id = parts[0].replace("*", "")
                            lang = parts[1] if len(parts) > 1 else "en"
                            voices.append(
                                {"id": voice_id, "name": voice_id, "language": lang}
                            )
    except Exception:
        pass

    if not voices:
        voices = [
            {
                "id": "en-US-Neural2-F",
                "name": "English US Neural Female",
                "language": "en-US",
            },
            {
                "id": "en-US-Neural2-M",
                "name": "English US Neural Male",
                "language": "en-US",
            },
            {
                "id": "en-GB-Neural2-F",
                "name": "English UK Neural Female",
                "language": "en-GB",
            },
            {
                "id": "en-GB-Neural2-M",
                "name": "English UK Neural Male",
                "language": "en-GB",
            },
        ]

    return voices
