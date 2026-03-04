from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import structlog
import asyncio
import base64
import traceback
import re

from backend.services.stt_stream_service import transcribe_stream
from backend.services.tts_service import get_tts_service, TTSService
from backend.services.orchestrator_service import get_orchestrator_service
from backend.services.agent_service import get_agent_service

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

# Sentence terminator pattern
SENTENCE_END_PATTERN = re.compile(r'[.!?]+')

# Default system prompt for the voice assistant
DEFAULT_SYSTEM_PROMPT = """You are a helpful and friendly voice assistant. 
Keep your responses concise and natural, as they will be spoken aloud.
Respond to user queries in a conversational manner."""


async def flush_sentence_to_tts(sentence: str, agent, tts_service: TTSService, websocket: WebSocket, manager: AgentConnectionManager):
    """
    Stream a complete sentence to TTS and send to client, using the agent's Voice Profile.
    """
    if not sentence or not sentence.strip():
        return
    
    sentence = sentence.strip()
    
    # Notify client that a sentence is starting, and who is speaking
    await manager.send_message({
        "type": "sentence_start",
        "text": sentence,
        "agent": {
            "id": agent.id,
            "name": agent.name,
            "color": agent.color
        }
    }, websocket)
    
    # Send speaking state when TTS starts
    await manager.send_message({"type": "state", "state": "speaking"}, websocket)
    
    # Map agent's linked voice profile if it exists, otherwise use TTS defaults.
    voice_profile_id = agent.voice_profile_id
    
    try:
        # Stream TTS audio for this sentence
        async for audio_bytes_chunk in tts_service.stream_audio_async(sentence, voice=voice_profile_id or tts_service.get_default_voice()):
            encoded_audio = base64.b64encode(audio_bytes_chunk).decode('utf-8')
            await websocket.send_json({
                "type": "tts_audio",
                "data": encoded_audio
            })
    except Exception as e:
        logger.error("tts_stream_failure", error=str(e))
    
    # Notify client that sentence is complete
    await manager.send_message({
        "type": "sentence_end",
        "text": sentence
    }, websocket)


def extract_sentences(text: str) -> tuple[str, str]:
    """
    Extract complete sentences from text, returning (complete, remaining).
    
    Args:
        text: Input text
        
    Returns:
        Tuple of (complete sentences, remaining partial sentence)
    """
    # Find all sentence-ending patterns
    match = SENTENCE_END_PATTERN.search(text)
    
    if match:
        # Return everything up to and including the sentence end as complete
        end_idx = match.end()
        return text[:end_idx].strip(), text[end_idx:].strip()
    
    return "", text

@router.websocket("/stream")
async def websocket_agent_stream(websocket: WebSocket):
    await manager.connect(websocket)
    tts_service = get_tts_service()
    orchestrator = get_orchestrator_service()
    agent_service = get_agent_service()
    
    # Grab the default session or create one
    sessions = agent_service.get_sessions()
    if not sessions:
        session = agent_service.create_session("WebSocket Stream Audio")
    else:
        session = sessions[0]

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
                
                # Send listening state (user stopped speaking, processing starts)
                await manager.send_message({"type": "state", "state": "listening"}, websocket)
                
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
                
                    # 3. Process LLM Logic with multi-agent orchestrator streaming
                    logger.info("agent_received_text", text=text)
                    
                    # Send processing state (LLM thinking)
                    await manager.send_message({"type": "state", "state": "processing"}, websocket)
                    
                    sentence_buffer = ""
                    last_speaking_agent = None
                    
                    try:
                        # Stream response from Orchestrator sentence by sentence
                        async for agent, chunk in orchestrator.stream_agent_response(session, text):
                            last_speaking_agent = agent
                            sentence_buffer += chunk
                            
                            # Check for complete sentences
                            complete_sentence, sentence_buffer = extract_sentences(sentence_buffer)
                            
                            if complete_sentence:
                                # Stream this complete sentence to TTS immediately using agent bounds
                                await flush_sentence_to_tts(
                                    complete_sentence, 
                                    agent,
                                    tts_service, 
                                    websocket, 
                                    manager
                                )
                        
                        # Handle any remaining content in buffer
                        if sentence_buffer and sentence_buffer.strip() and last_speaking_agent:
                            await flush_sentence_to_tts(
                                sentence_buffer,
                                last_speaking_agent,
                                tts_service,
                                websocket,
                                manager
                            )
                            
                    except Exception as e:
                        logger.error("orchestrator_stream_error", error=str(e), traceback=traceback.format_exc())
                        # Send fallback message
                        fallback = "I'm sorry, I'm having trouble processing that right now."
                        await flush_sentence_to_tts(fallback, agent_service.get_agents()[0], tts_service, websocket, manager)
                    
                    # Notify LLM processing is complete
                    await manager.send_message({"type": "llm_end"}, websocket)
                    
                    # Send idle state (conversation turn complete)
                    await manager.send_message({"type": "state", "state": "idle"}, websocket)

            elif message.get("type") == "reset":
                cumulative_audio = bytearray()
                session = agent_service.create_session("Reset Session") # Reset means new session mathematically
                await manager.send_message({"type": "reset", "message": "Context cleared"}, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("agent_websocket_disconnected")
    except Exception as e:
        logger.error("agent_websocket_error", traceback=traceback.format_exc())
        manager.disconnect(websocket)
