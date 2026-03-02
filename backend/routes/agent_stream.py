from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import structlog
import asyncio
import base64
import traceback
import re

from backend.services.stt_stream_service import transcribe_stream
from backend.services.tts_service import get_tts_service
from backend.services.llm_service import get_llm_service

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


async def flush_sentence_to_tts(sentence: str, tts_service, websocket, manager):
    """
    Stream a complete sentence to TTS and send to client.
    
    Args:
        sentence: The sentence text to speak
        tts_service: TTS service instance
        websocket: WebSocket connection
        manager: Connection manager
    """
    if not sentence or not sentence.strip():
        return
    
    sentence = sentence.strip()
    
    # Notify client that a sentence is starting
    await manager.send_message({
        "type": "sentence_start",
        "text": sentence
    }, websocket)
    
    # Stream TTS audio for this sentence
    async for audio_bytes_chunk in tts_service.stream_audio_async(sentence):
        encoded_audio = base64.b64encode(audio_bytes_chunk).decode('utf-8')
        await websocket.send_json({
            "type": "tts_audio",
            "data": encoded_audio
        })
    
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
                
                    # 3. Process LLM Logic with streaming
                    context_buffer.append({"role": "user", "content": text})
                    logger.info("agent_received_text", text=text)
                    
                    # Notify LLM processing is starting
                    await manager.send_message({"type": "llm_start"}, websocket)
                    
                    # Get LLM service
                    llm_service = get_llm_service()
                    
                    # Sentence buffer for streaming
                    sentence_buffer = ""
                    
                    try:
                        # Stream response from LLM sentence by sentence
                        async for chunk in llm_service.stream_completion(
                            messages=context_buffer,
                            system_prompt=DEFAULT_SYSTEM_PROMPT
                        ):
                            sentence_buffer += chunk
                            
                            # Check for complete sentences
                            complete_sentence, sentence_buffer = extract_sentences(sentence_buffer)
                            
                            if complete_sentence:
                                # Add to context
                                context_buffer.append({"role": "assistant", "content": complete_sentence})
                                
                                # Stream this complete sentence to TTS immediately
                                await flush_sentence_to_tts(
                                    complete_sentence, 
                                    tts_service, 
                                    websocket, 
                                    manager
                                )
                        
                        # Handle any remaining content in buffer
                        if sentence_buffer and sentence_buffer.strip():
                            context_buffer.append({"role": "assistant", "content": sentence_buffer})
                            await flush_sentence_to_tts(
                                sentence_buffer,
                                tts_service,
                                websocket,
                                manager
                            )
                            
                    except Exception as e:
                        logger.error("llm_stream_error", error=str(e), traceback=traceback.format_exc())
                        # Send fallback message
                        fallback = "I'm sorry, I'm having trouble processing that right now."
                        context_buffer.append({"role": "assistant", "content": fallback})
                        await flush_sentence_to_tts(fallback, tts_service, websocket, manager)
                    
                    # Notify LLM processing is complete
                    await manager.send_message({"type": "llm_end"}, websocket)

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
