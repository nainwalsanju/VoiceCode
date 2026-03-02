# Phase 2: Full Conversation Pipeline - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Full voice conversation loop with AI agent and multiple voice options. This phase delivers:
- LLM integration for AI responses (NVIDIA API for now, local CLI agents in future)
- Sentence-by-sentence streaming to TTS in real-time
- Session context (conversation history)
- Voice selection UI with 4-6 voice options as cards with preview
- Transcript display showing conversation history with timestamps

Out of scope for this phase: Voice cloning, interruption handling (Phase 3), system tray (Phase 4)

</domain>

<decisions>
## Implementation Decisions

### LLM Integration
- **Primary:** NVIDIA API (via OpenAI-compatible endpoint)
- **Future:** Local CLI agents (Ollama, llama.cpp) - noted for Phase 3+
- **Streaming:** Real-time token streaming to TTS (YES)
- **Conversation history:** Keep last 10 message exchanges in context

### Token Streaming
- **Method:** Sentence-by-sentence streaming
- **Behavior:** Stream to TTS when LLM completes a sentence, not full response
- **Rationale:** Balanced between speed (faster than full response) and quality (complete sentences)

### Voice Selection UI
- **Display:** Voice cards in a grid layout
- **Features:**
  - Preview button for each voice (play sample)
  - Default voice: User picks in settings
  - Show voice engine info (e.g., "Qwen3-TTS", "Kokoro", "NeuTTS")
- **Voices:** 4-6 built-in options across different engines

### Transcript Display
- **Type:** Full history - scrollable list of all exchanges
- **Features:**
  - Timestamps for each exchange
  - User messages on one side, AI responses on another
  - Older messages accessible via scroll

### Claude's Discretion
- Exact card layout (grid vs list)
- Preview audio duration (3-5 seconds)
- Scroll behavior (auto-scroll to latest, or manual)
- Timestamp format (relative "2 min ago" vs absolute "10:30 AM")

</decisions>

<specifics>
## Specific Ideas

- "Like ChatGPT voice mode - sentence-by-sentence streaming"
- Voice cards should show: voice name, engine, preview button
- Transcript should look like a conversation thread with clear user/AI distinction

</specifics>

(code_context>
## Existing Code Insights

### Reusable Assets
- `VoiceSelector.tsx` - Can be adapted for voice cards with preview
- `DictationDisplay.tsx` - Base for transcript with history + timestamps
- `agent_stream.py` - Has context_buffer, needs actual LLM integration
- `tts_service.py` - 5 TTS engines already integrated

### Established Patterns
- WebSocket streaming for audio (VoiceButton)
- Base64 encoding for audio chunks over WebSocket
- State machine in VoiceButton: idle, connecting, listening, speaking, error

### Integration Points
- LLM integration: `backend/routes/agent_stream.py` (replace stub)
- Voice selection: Settings panel or main UI
- Transcript: DictationDisplay component needs multi-turn support

</code_context>

<deferred>
## Deferred Ideas

- Local CLI agents (Ollama, llama.cpp) - Future phase (Phase 3+)
- Voice cloning - Phase 3
- Interruption handling (barge-in) - Phase 3
- System tray - Phase 4

</deferred>

---

*Phase: 02-full-conversation-pipeline*
*Context gathered: 2026-03-03*
