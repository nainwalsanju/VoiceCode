# Requirements: VoiceCode

**Defined:** 2026-03-02
**Core Value:** Users can have natural, real-time voice conversations with an AI assistant, with the ability to customize the assistant's voice by cloning any person's voice.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Audio Pipeline

- [ ] **AUDIO-01**: Application captures audio from microphone in real-time
- [ ] **AUDIO-02**: Voice Activity Detection (VAD) detects when user starts/stops speaking
- [ ] **AUDIO-03**: Audio streaming pipeline handles continuous capture without dropouts
- [ ] **AUDIO-04**: Audio playback outputs TTS response through speakers

### Speech-to-Text (STT) - Pluggable Engine

- [ ] **STT-01**: User speech is transcribed to text with <500ms latency
- [ ] **STT-02**: Interim results are streamed while user is still speaking
- [ ] **STT-03**: Transcription handles natural speech patterns (pauses, ums)
- [ ] **STT-04**: Moonshine v2 integration (80ms, CPU/edge)
- [ ] **STT-05**: Voxtral Mini 4B integration (<500ms, browser/WebGPU)
- [ ] **STT-06**: Parakeet TDT 0.6B integration (~30ms, GPU)
- [ ] **STT-07**: User can switch between STT engines via settings

### Text-to-Speech (TTS) - Pluggable Engine

- [ ] **TTS-01**: TTS response streams audio progressively (not wait for full text)
- [ ] **TTS-02**: First audio plays within 250ms of response generation
- [ ] **TTS-03**: Multiple voice options available (4-6 distinct voices)
- [ ] **TTS-04**: Qwen3-TTS integration (97ms latency, 3s voice cloning)
- [ ] **TTS-05**: NeuTTS Air integration (real-time, instant voice cloning)
- [ ] **TTS-06**: NeuTTS Nano integration (edge devices, 120M params)
- [ ] **TTS-07**: PocketTTS integration (CPU-only, 100M params)
- [ ] **TTS-08**: Kokoro integration (best open-source quality)
- [ ] **TTS-09**: User can switch between TTS engines via settings

### AI Agent

- [ ] **AGENT-01**: Transcribed text is sent to LLM for processing
- [ ] **AGENT-02**: LLM response streams token-by-token for TTS input
- [ ] **AGENT-03**: Agent maintains conversation context within session
- [ ] **AGENT-04**: Fallback handling when LLM is unavailable

### Conversation Flow

- [ ] **CONV-01**: System detects when user has finished speaking (turn endpointing)
- [ ] **CONV-02**: Continuous conversation without re-triggering between exchanges
- [ ] **CONV-03**: Session state management (IDLE → LISTENING → PROCESSING → SPEAKING)
- [ ] **CONV-04**: User can interrupt response mid-generation (barge-in)
- [ ] **CONV-05**: TTS stops immediately when user starts speaking

### Voice Cloning (All TTS Engines)

- [ ] **CLONE-01**: User can upload audio sample (2-15 seconds) to clone voice
- [ ] **CLONE-02**: Cloned voice is available immediately for TTS output
- [ ] **CLONE-03**: Multiple cloned voices can be saved and selected
- [ ] **CLONE-04**: Voice cloning works with all supported TTS engines

### User Interface

- [ ] **UI-01**: Push-to-talk or voice activation toggle
- [ ] **UI-02**: Visual indicator showing current state (listening, processing, speaking)
- [ ] **UI-03**: Transcript display showing conversation history
- [ ] **UI-04**: Voice selection dropdown with preview capability
- [ ] **UI-05**: Settings panel for voice cloning and preferences

### Desktop Integration

- [ ] **DESK-01**: Application runs as desktop app (Tauri)
- [ ] **DESK-02**: System tray support for background operation
- [ ] **DESK-03**: Global hotkey to activate voice input
- [ ] **DESK-04**: Native window controls (minimize, maximize, close)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Context memory persists across sessions
- **ADV-02**: Multi-language support (non-English)
- **ADV-03**: Deep app integrations (calendar, email, smart home)
- **ADV-04**: Visual components during voice interaction

### Performance

- **PERF-01**: Self-hosted STT/TTS options for offline mode
- **PERF-02**: Adaptive VAD tuning for different acoustic environments
- **PERF-03**: Circuit breakers and fallback providers

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Video capability | Audio-first is core value, video adds high complexity |
| Mobile app | Desktop-first, mobile later |
| Multi-language (v1) | Focus on English-only for best quality |
| Real-time translation | Deferred to v2+ |
| Voice recording/storage | Privacy-first, no cloud storage of user audio |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIO-01 | Phase 1 | Pending |
| AUDIO-02 | Phase 1 | Pending |
| AUDIO-03 | Phase 1 | Pending |
| AUDIO-04 | Phase 1 | Pending |
| STT-01 | Phase 1 | Pending |
| STT-02 | Phase 1 | Pending |
| STT-03 | Phase 1 | Pending |
| STT-04 | Phase 1 | Pending |
| TTS-01 | Phase 1 | Pending |
| TTS-02 | Phase 1 | Pending |
| TTS-03 | Phase 2 | Pending |
| TTS-04 | Phase 1 | Pending |
| TTS-05 | Phase 2 | Pending |
| AGENT-01 | Phase 2 | Pending |
| AGENT-02 | Phase 2 | Pending |
| AGENT-03 | Phase 2 | Pending |
| AGENT-04 | Phase 2 | Pending |
| CONV-01 | Phase 1 | Pending |
| CONV-02 | Phase 2 | Pending |
| CONV-03 | Phase 2 | Pending |
| CONV-04 | Phase 3 | Pending |
| CONV-05 | Phase 3 | Pending |
| CLONE-01 | Phase 3 | Pending |
| CLONE-02 | Phase 3 | Pending |
| CLONE-03 | Phase 3 | Pending |
| CLONE-04 | Phase 3 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| DESK-01 | Phase 1 | Pending |
| DESK-02 | Phase 4 | Pending |
| DESK-03 | Phase 3 | Pending |
| DESK-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

**Phase Mapping Summary:**
- Phase 1 (Core Audio Pipeline): 16 requirements
- Phase 2 (Full Conversation Pipeline): 9 requirements
- Phase 3 (Conversation Flow & Voice Features): 8 requirements
- Phase 4 (Polish & Desktop Integration): 1 requirement

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after research synthesis*
