# Architecture Research

**Domain:** Real-time Voice Assistant Systems
**Researched:** 2026-03-02
**Confidence:** HIGH

## Standard Architecture

### System Overview

Real-time voice assistants follow one of three architectural patterns. For VoiceCode, the **Classic ASR + LLM + TTS Pipeline** is recommended for initial development due to proven reliability, extensive tooling, and component flexibility. The newer Speech-to-Speech models may become viable options as the technology matures.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│  │ Audio Input │───▶│   WebRTC    │───▶│ Audio Output│           │
│  │  (Microphone│    │   Client    │    │  (Speaker)  │           │
│  └─────────────┘    └──────┬──────┘    └─────────────┘           │
│                             │                                        │
├─────────────────────────────┼────────────────────────────────────────┤
│                        Transport Layer                               │
├─────────────────────────────┼────────────────────────────────────────┤
│                    ┌────────▼────────┐                              │
│                    │  LiveKit Server │                              │
│                    │  (SFU + Room)   │                              │
│                    └────────┬────────┘                              │
│                             │                                        │
├─────────────────────────────┼────────────────────────────────────────┤
│                    Pipeline Layer                                     │
├─────────────────────────────┼────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────▼─────┐    ┌─────────────┐             │
│  │     VAD     │───▶│    STT    │───▶│    LLM      │             │
│  │ (silence/   │    │(Whisper/  │    │ (GPT-4o/    │             │
│  │  speech det)│    │ Deepgram) │    │  Claude)    │             │
│  └─────────────┘    └─────┬─────┘    └──────┬──────┘             │
│                           │                  │                      │
│                           │         ┌────────▼────────┐            │
│                           │         │   Agent Logic   │            │
│                           │         │  (Tool calling, │            │
│                           │         │   context, etc) │            │
│                           │         └────────┬────────┘            │
│                           │                  │                      │
│                           │         ┌─────────▼─────────┐          │
│                           └────────▶│       TTS         │          │
│                                     │ (ElevenLabs/       │          │
│                                     │  Cartesia)         │          │
│                                     └─────────┬─────────┘          │
│                                               │                      │
└───────────────────────────────────────────────┼──────────────────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │   Voice Cloning       │
                                    │   (if enabled)        │
                                    └───────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation | VoiceCode Priority |
|-----------|----------------|------------------------|-------------------|
| **Audio Input** | Capture microphone audio, apply noise reduction | WebRTC getUserMedia, AudioWorklet | Required |
| **VAD (Voice Activity Detection)** | Detect speech vs silence, endpointing | Silero VAD, WebRTC VAD | Critical |
| **STT (Speech-to-Text)** | Convert audio to text | Deepgram Nova-2, Whisper | Critical |
| **LLM (Language Model)** | Process intent, generate responses | OpenAI GPT-4o, Claude | Critical |
| **TTS (Text-to-Speech)** | Convert text to speech | ElevenLabs, Cartesia Sonic | Critical |
| **Voice Cloning** | Generate custom voice profiles | ElevenLabs Voice Library | Feature-specific |
| **Agent Logic** | Manage conversation flow, tool execution | Custom implementation | Critical |
| **Transport (WebRTC)** | Real-time audio streaming | LiveKit, self-hosted | Critical |
| **Session Management** | Maintain conversation state, history | In-memory + persistence | Required |

## Recommended Project Structure

```
src-tauri/                    # Desktop app (Tauri)
├── src/
│   ├── main.rs              # App entry point
│   ├── audio/               # Audio capture/playback
│   │   ├── mod.rs
│   │   ├── input.rs         # Microphone handling
│   │   └── output.rs        # Audio playback
│   └── webrtc/              # WebRTC integration
│       └── mod.rs
│
src/                          # Frontend (React/TypeScript)
├── components/
│   ├── VoiceChat/           # Main conversation UI
│   │   ├── VoiceChat.tsx
│   │   ├── AudioVisualizer.tsx
│   │   └── TranscriptDisplay.tsx
│   └── VoiceSettings/       # Voice configuration UI
│       ├── VoiceSettings.tsx
│       └── VoiceClone.tsx
├── hooks/
│   ├── useVoicePipeline.ts   # Main voice pipeline hook
│   ├── useAudioCapture.ts    # Microphone management
│   └── useWebRTC.ts          # WebRTC connection
├── services/
│   ├── livekit.ts           # LiveKit client service
│   ├── stt.ts               # STT service adapter
│   ├── tts.ts               # TTS service adapter
│   └── agent.ts             # Agent logic service
├── stores/
│   ├── voiceStore.ts        # Voice state (Zustand)
│   └── sessionStore.ts      # Session/conversation state
└── types/
    └── voice.ts             # TypeScript types

backend/                      # Backend services (if needed)
├── agent/                    # Agent logic server
│   ├── src/
│   │   ├── main.rs
│   │   ├── agent.rs         # Agent implementation
│   │   ├── tools/           # Tool definitions
│   │   └── prompts/         # Agent prompts
│   └── Cargo.toml
└── livekit/                 # LiveKit server (or use Cloud)
```

### Structure Rationale

- **src-tauri/**: Desktop wrapper handles native audio APIs and WebRTC native bindings
- **src/components/**: UI components organized by feature domain
- **src/hooks/**: Custom hooks encapsulate audio/WebRTC complexity
- **src/services/**: Service layer abstracts external API integrations
- **src/stores/**: State management for voice state and conversation history
- **backend/agent/**: Rust-based agent for performance-critical processing (optional—can run in-process)

## Architectural Patterns

### Pattern 1: Streaming Pipeline Architecture

**What:** Audio flows continuously through the pipeline with streaming at every layer—STT sends incremental results, LLM streams tokens, TTS streams audio chunks.

**When to use:** Always for real-time voice. This is the baseline requirement for natural conversation.

**Trade-offs:**
- Pro: Minimal perceived latency (response starts before generation completes)
- Pro: Better user experience—feels conversational
- Con: More complex to orchestrate (need to handle partial outputs)
- Con: Harder to debug (intermediate states)

**Example:**
```typescript
// Streaming STT sends incremental transcriptions
const sttStream = await deepgram.transcribe({
  encoding: 'mulaw',
  sample_rate: 16000,
  interim_results: true,
});

sttStream.on('transcript', (transcript) => {
  if (transcript.is_final) {
    // Send to LLM for processing
    llmStream.write(transcript.text);
  }
});

// LLM streams tokens to TTS
llmStream.on('token', (token) => {
  ttsStream.write(token);  // Start TTS before LLM finishes
});

// TTS streams audio chunks to client
ttsStream.on('audio', (audioChunk) => {
  rtcConnection.publishAudio(audioChunk);
});
```

### Pattern 2: Turn-Taking with VAD

**What:** Voice Activity Detection determines when user stops speaking, triggering agent response. Must handle interruptions (barge-in) when user starts speaking during agent response.

**When to use:** Required for any conversational voice interface.

**Trade-offs:**
- Pro: Enables natural conversation flow
- Pro: Allows user interruptions
- Con: VAD thresholds require tuning per use case
- Con: False positives (detecting breath as speech) create awkward pauses

**Example:**
```typescript
// VAD configuration
const vad = new VAD({
  min_speech_duration_ms: 250,
  padding_duration_ms: 400,
  speech_pad_ms: 400,
});

vad.on('speech_start', () => {
  console.log('User started speaking');
  // If agent is speaking, stop TTS (barge-in)
  if (agentState === 'speaking') {
    ttsStream.cancel();
    emitAudioEvent({ type: 'interrupt' });
  }
});

vad.on('speech_end', async () => {
  console.log('User finished speaking');
  // Wait brief silence before processing
  await delay(200);
  // Trigger agent response
  const transcript = getFinalTranscript();
  await processWithAgent(transcript);
});
```

### Pattern 3: Session-Based State Management

**What:** Each conversation is a session with its own context, history, and state. Sessions should survive brief disconnections.

**When to use:** Required for multi-turn conversations.

**Trade-offs:**
- Pro: Clean separation of conversation contexts
- Pro: Enables session resumption after network issues
- Con: Requires session persistence strategy
- Con: Memory management for long-running sessions

**Example:**
```typescript
interface VoiceSession {
  id: string;
  participantId: string;
  history: ConversationTurn[];
  context: SessionContext;
  startedAt: Date;
  lastActivityAt: Date;
}

interface ConversationTurn {
  role: 'user' | 'agent';
  transcript: string;
  audioUrl?: string;
  timestamp: Date;
  duration?: number;
}

// Session restoration on reconnect
async function restoreSession(sessionId: string) {
  const session = await sessionStore.get(sessionId);
  if (session && Date.now() - session.lastActivityAt < SESSION_TIMEOUT) {
    await agent.loadContext(session.context);
    // Optionally replay last N turns as audio
    return session;
  }
  // Start fresh session
  return createNewSession();
}
```

### Pattern 4: Parallel Tool Execution

**What:** Agent can execute multiple tools in parallel when appropriate, then synthesize results into response.

**When to use:** When agent needs to gather multiple pieces of information before responding.

**Trade-offs:**
- Pro: Faster response when multiple queries are independent
- Con: More complex error handling
- Con: May need to trim/fallback if tools timeout

**Example:**
```typescript
// Agent decides to fetch weather + calendar in parallel
const toolCalls = [
  { tool: 'get_weather', args: { location: 'NYC' } },
  { tool: 'get_calendar', args: { date: 'today' } },
];

const results = await Promise.all(
  toolCalls.map(tc => executeTool(tc.tool, tc.args))
);

// Synthesize results into response
const response = await llm.generate(
  `User asked about plans. Results: ${JSON.stringify(results)}`
);
```

## Data Flow

### Request Flow (User Speaks → Agent Responds)

```
[User Voice]
    │
    ▼
┌─────────────────┐
│ Audio Capture   │ ── getUserMedia() → AudioStream
│ (Microphone)    │
└────────┬────────┘
         │ PCM 16kHz mono
         ▼
┌─────────────────┐
│ WebRTC Transport│ ── LiveKit publishTrack()
│ (to server)     │
└────────┬────────┘
         │ RTP audio packets
         ▼
┌─────────────────┐
│ VAD             │ ── Detects speech/silence boundaries
│ (silence detection)
└────────┬────────┘
         │ audio chunks
         ▼
┌─────────────────┐
│ STT             │ ── Deepgram/Whisper streaming
│ (to text)       │ ── interim_results: true
└────────┬────────┘
         │ transcript (incremental)
         ▼
┌─────────────────┐
│ LLM             │ ── Process with context
│ (generate)      │ ── Stream tokens
└────────┬────────┘
         │ response text (streaming)
         ▼
┌─────────────────┐
│ Voice Cloning   │ ── If custom voice enabled
│ (voice profile)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TTS             │ ── ElevenLabs/Cartesia
│ (to audio)      │ ── stream: true
└────────┬────────┘
         │ audio chunks
         ▼
┌─────────────────┐
│ WebRTC Transport│ ── LiveKit publishTrack()
│ (to client)     │
└────────┬────────┘
         │ RTP audio
         ▼
┌─────────────────┐
│ Audio Output    │ ── WebRTC remote track
│ (Speaker)       │ ── Playback
└─────────────────┘
```

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                     Voice State                              │
├─────────────────────────────────────────────────────────────┤
│  IDLE ──▶ LISTENING ──▶ PROCESSING ──▶ SPEAKING ──▶ IDLE   │
│    ▲                                                    │    │
│    └────────────────────────────────────────────────────┘    │
│                                                              │
│  States:                                                    │
│  - IDLE: Waiting for user to start                         │
│  - LISTENING: User is speaking (VAD active)                 │
│  - PROCESSING: Transcribing + generating response          │
│  - SPEAKING: Agent is responding via TTS                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Data Flows

1. **Voice Input Flow:** Microphone → WebRTC → VAD → STT → Transcript
2. **Agent Processing Flow:** Transcript → LLM → Tool Execution → Response
3. **Voice Output Flow:** Response → TTS → Voice Cloning → WebRTC → Speaker
4. **Turn-Taking Flow:** VAD speech_end → Wait silence → Trigger agent → Start TTS → Detect user speech → Barge-in
5. **Session Recovery Flow:** Disconnect → Detect → Reconnect → Restore session context → Resume

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Single LiveKit server, in-process agent, basic STT/TTS |
| 100-1K users | LiveKit Cloud or clustered servers, connection pooling for LLM/STT/TTS |
| 1K-10K users | Multiple agent workers, Redis for session state, CDN for TTS audio |
| 10K+ users | Geo-distributed deployment, autoscaling agent pools, dedicated STT/TTS infrastructure |

### Scaling Priorities

1. **First bottleneck: STT latency**
   - Solution: Switch to faster STT (Deepgram Nova-2 over Whisper), enable interim results
2. **Second bottleneck: LLM token generation**
   - Solution: Use faster models (GPT-4o-mini), implement streaming, cache common responses
3. **Third bottleneck: TTS synthesis time**
   - Solution: Use low-latency TTS (Cartesia Sonic ~100ms), pre-generate common responses

## Anti-Patterns

### Anti-Pattern 1: Blocking STT → LLM → TTS

**What people do:** Wait for complete STT transcription before sending to LLM, wait for full LLM response before TTS.

**Why it's wrong:** Creates 2-4 second delays. User perceives system as unresponsive.

**Do this instead:** Stream everything. Send interim STT results, stream LLM tokens, start TTS before LLM completes.

### Anti-Pattern 2: No Barge-In Handling

**What people do:** Let agent finish speaking before allowing user to interrupt.

**Why it's wrong:** Extremely frustrating. Users feel ignored. Can't correct mistakes.

**Do this instead:** Monitor for user audio during TTS. Cancel TTS and switch to listening when detected.

### Anti-Pattern 3: Fixed VAD Thresholds

**What people do:** Set single VAD threshold and silence duration for all conditions.

**Why it's wrong:** Different environments (quiet office vs noisy street) need different settings. Network jitter affects detection timing.

**Do this instead:** Adaptive VAD thresholds based on ambient noise level. Tunable silence duration (400-800ms range).

### Anti-Pattern 4: No Session State Persistence

**What people do:** Keep all conversation state in memory only.

**Why it's wrong:** Any disconnect loses all context. User must repeat themselves.

**Do this instead:** Persist session state (to database or Redis). Implement graceful session recovery on reconnect.

### Anti-Pattern 5: Hardcoded Service Providers

**What people do:** Lock into single STT/LLM/TTS provider with no abstraction.

**Why it's wrong:** Pricing changes, outages, new better options. Vendor lock-in limits flexibility.

**Do this instead:** Use adapter pattern for STT/TTS. LiveKit plugins make this straightforward.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **LiveKit** | WebRTC server, room management | Core transport layer. Use Cloud or self-hosted |
| **Deepgram** | STT streaming API | nova-2 model, ~150ms latency, excellent accuracy |
| **OpenAI** | LLM API + Realtime API | GPT-4o for reasoning, Whisper for STT |
| **ElevenLabs** | TTS API + Voice Library | High-quality TTS, voice cloning support |
| **Cartesia** | TTS streaming API | ~100ms latency, fast time-to-first-audio |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ WebRTC | WebRTC tracks | Audio stream via LiveKit SDK |
| WebRTC ↔ VAD | Audio callback | Process audio frames in real-time |
| VAD ↔ STT | Event (speech_end) | Trigger transcription on speech end |
| STT ↔ LLM | Stream (transcripts) | Send incremental/final transcripts |
| LLM ↔ TTS | Stream (tokens) | Stream response as generated |
| TTS ↔ WebRTC | Audio chunks | Publish to room as generated |
| Agent Logic ↔ Tools | Function calls | Execute tools, incorporate results |

## Latency Budget

For natural conversation (target < 800ms end-to-end):

| Component | Target Latency | Notes |
|-----------|---------------|-------|
| Audio capture | 10-20ms | Browser/microphone delay |
| WebRTC transport | 20-50ms | Network-dependent |
| VAD detection | 40-100ms | Silence duration setting |
| STT | 100-300ms | Deepgram nova-2 ~150ms |
| LLM | 200-500ms | Depends on model, streaming helps |
| TTS | 75-200ms | Cartesia ~100ms, ElevenLabs ~300ms |
| **Total** | **445-1170ms** | Highly variable |

**Optimization strategies:**
- Stream at every layer (STT interim, LLM tokens, TTS chunks)
- Use low-latency providers (Deepgram, Cartesia)
- Pre-warm connections on app start
- Process in parallel where possible (tool calls)

## Sources

- [LiveKit Architecture Deep Dive](https://agentfactory.panaversity.org/docs/Building-Realtime-Voice-Agents/livekit-agents/livekit-architecture) — Authoritative, 2026
- [Voice Agent Architecture: Technical Deep Dive](https://www.ringai.com/blog/voice-agent-architecture-technical-guide) — Authoritative, 2026
- [Building Real-Time Voice Assistants with Amazon Nova Sonic](https://aws.amazon.com/blogs/machine-learning/building-real-time-voice-assistants-with-amazon-nova-sonic-compared-to-cascading-architectures/) — AWS, 2026
- [Voice AI Stack for Building Agents](https://www.assemblyai.com/blog/the-voice-ai-stack-for-building-agents) — AssemblyAI, 2026
- [Building a Real-Time Voice AI Agent Using Pipecat](https://medium.com/@ganapathinalam4/building-a-real-time-voice-ai-agent-using-pipecat-11f633fc3405) — Medium, 2026
- [Build a Real-Time, Full-Duplex Voice AI with WebRTC](https://zediot.com/blog/building-full-duplex-conversational-ai-with-rtc-ai/) — ZedIoT, 2025
- [Voice AI Infrastructure: Building Real-Time Speech Agents](https://introl.com/blog/voice-ai-infrastructure-real-time-speech-agents-asr-tts-guide-2025) — Introl, 2025

---

*Architecture research for: VoiceCode*
*Researched: 2026-03-02*
