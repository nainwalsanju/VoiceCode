from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import structlog
import asyncio
import base64
import traceback

from backend.services.stt_stream_service import transcribe_stream
from backend.services.tts_service import get_tts_service

logger = structlog.get_logger()
router = APIRouter(prefix="/agent", tags=["agent"])

class AgentConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error("agent_websocket_send_error", error=str(e))

manager = AgentConnectionManager()

@router.websocket("/stream")
async def websocket_agent_stream(websocket: WebSocket):
    await manager.connect(websocket)
    tts_service = get_tts_service()
    
    # Simple simulated conversational context
    context_buffer = []
    cumulative_audio = bytearray()

    try:
        await manager.send_message({"type": "ready", "message": "Voice Agent Ready"}, websocket)

        while True:
            data = await websocket.receive_text()
            print(f"trace_0_received_raw_data length {len(data)}", flush=True)

            try:
                message = json.loads(data)
            except Exception as e:
                print(f"JSON Parse Error: {e}, Data snippet: {data[:100]}", flush=True)
                continue

            if message.get("type") == "audio":
                print("trace_1_gathered_audio", flush=True)
                base64_data = message.get("data", "")
                if not base64_data:
                    print("trace_no_base64_found", flush=True)
                    continue
                
                try:
                    audio_chunk = base64.b64decode(base64_data)
                    cumulative_audio.extend(audio_chunk)
                    print(f"trace_2_decoded_b64 length {len(audio_chunk)}", flush=True)
                except Exception as e:
                    print(f"trace_b64_decode_error {e}", flush=True)
                    continue
                    
                print("trace_3_calling_transcribe_stream", flush=True)
                try:
                    result = await transcribe_stream(bytes(cumulative_audio))
                    print(f"trace_4_transcribe_completed result {result}", flush=True)
                except Exception as e:
                    print(f"trace_transcribe_error {e}\n{traceback.format_exc()}", flush=True)
                    continue

                text = result.get("text", "").strip()
                
                if not text:
                    continue
                    
                await manager.send_message({
                    "type": "transcription",
                    "text": text,
                    "is_final": False
                }, websocket)
                
            elif message.get("type") == "audio_end":
                print("trace_audio_end_received", flush=True)
                # Compute final transcription
                try:
                    result = await transcribe_stream(bytes(cumulative_audio))
                except Exception as e:
                    print(f"trace_transcribe_error {e}", flush=True)
                    continue
                    
                text = result.get("text", "").strip()
                if text:
                    await manager.send_message({
                        "type": "transcription",
                        "text": text,
                        "is_final": True
                    }, websocket)
                
                    # 3. Process LLM Logic
                    context_buffer.append({"role": "user", "content": text})
                    logger.info("agent_received_text", text=text)
                    
                    agent_response_text = f"Got it, you said: {text}. Main isko process kar raha hoon." 
                    context_buffer.append({"role": "assistant", "content": agent_response_text})
                    
                    await manager.send_message({
                        "type": "agent_response",
                        "text": agent_response_text
                    }, websocket)
                    
                    # 4. Stream TTS rendering
                    logger.info("trace_5_sending_tts_start")
                    await manager.send_message({"type": "tts_start"}, websocket)
                    
                    logger.info("trace_6_generating_audio_bytes")
                    async for audio_bytes_chunk in tts_service.stream_audio_async(agent_response_text):
                        # Use base64 string encoding instead of massive JSON integer arrays which freeze frontend parsers
                        encoded_audio = base64.b64encode(audio_bytes_chunk).decode('utf-8')
                        await websocket.send_json({
                            "type": "tts_audio",
                            "data": encoded_audio
                        })
                        
                    logger.info("trace_7_tts_audio_finished")
                    await manager.send_message({"type": "tts_end"}, websocket)

            elif message.get("type") == "reset":
                context_buffer = []
                cumulative_audio = bytearray()
                await manager.send_message({"type": "reset", "message": "Context cleared"}, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("agent_websocket_disconnected")
    except Exception as e:
        logger.error("agent_websocket_error", traceback=traceback.format_exc())
        manager.disconnect(websocket)
