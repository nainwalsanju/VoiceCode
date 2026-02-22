from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File
from typing import List
import asyncio
import json
import structlog

from backend.services.stt_stream_service import transcribe_stream

logger = structlog.get_logger()

router = APIRouter(prefix="/stt", tags=["stt"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error("websocket_send_error", error=str(e))


manager = ConnectionManager()


@router.websocket("/stream")
async def websocket_transcribe(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        await websocket.send_json(
            {"type": "ready", "message": "Connected to STT stream"}
        )

        audio_buffer = b""

        while True:
            data = await websocket.receive()

            if "text" in data:
                message = json.loads(data["text"])

                if message.get("type") == "audio":
                    audio_chunk = bytes(message.get("data", []))
                    if audio_chunk:
                        result = await transcribe_stream(audio_chunk)

                        await manager.send_message(
                            {
                                "type": "transcription",
                                "text": result["text"],
                                "language": result["language"],
                                "is_final": result.get("is_final", True),
                            },
                            websocket,
                        )

                elif message.get("type") == "reset":
                    audio_buffer = b""
                    await manager.send_message(
                        {"type": "reset", "message": "Buffer cleared"}, websocket
                    )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("websocket_disconnected")
    except Exception as e:
        logger.error("websocket_error", error=str(e))
        manager.disconnect(websocket)


@router.post("/transcribe-file")
async def transcribe_file(file: UploadFile = File(...), model: str = "base"):
    try:
        audio_bytes = await file.read()

        if not audio_bytes:
            return {"error": "Empty file"}, 400

        result = await transcribe_stream(audio_bytes, model)

        return {"text": result["text"], "language": result["language"]}
    except Exception as e:
        logger.error("transcribe_file_error", error=str(e))
        return {"error": str(e)}, 500
