# VoiceCode Roadmap

## Project Overview

**Core Value:** Users can have natural, real-time voice conversations with an AI assistant, with the ability to customize the assistant's voice by cloning any person's voice.

**Depth:** Quick (3-5 phases)

---

## Phases

- [ ] **Phase 1: Core Audio Pipeline** - Audio capture, STT, basic TTS, desktop window
- [ ] **Phase 2: Full Conversation Pipeline** - LLM integration, streaming TTS, voice options, session state
- [ ] **Phase 3: Conversation Flow & Voice Features** - Interruption handling, voice cloning
- [ ] **Phase 4: Polish & Desktop Integration** - System tray, global hotkey, reliability

---

## Phase Details

### Phase 1: Core Audio Pipeline

**Goal:** Users can speak and receive audio responses through a working audio pipeline

**Depends on:** Nothing (first phase)

**Requirements:** AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, STT-01, STT-02, STT-03, STT-04, TTS-01, TTS-02, TTS-04, CONV-01, UI-01, UI-02, DESK-01, DESK-04

**Success Criteria** (what must be TRUE):

1. User can speak and see their speech transcribed to text within 500ms
2. Interim transcription results appear while user is still speaking
3. TTS audio streams progressively (not waiting for full response)
4. First TTS audio plays within 250ms of response generation
5. Visual indicator clearly shows current state (listening, processing, speaking)
6. Desktop window controls (minimize, maximize, close) work correctly

**Plans:** TBD

---

### Phase 2: Full Conversation Pipeline

**Goal:** Full voice conversation loop with AI agent and multiple voice options

**Depends on:** Phase 1

**Requirements:** TTS-03, TTS-05, AGENT-01, AGENT-02, AGENT-03, AGENT-04, CONV-02, CONV-03, UI-03

**Success Criteria** (what must be TRUE):

1. User speaks, AI processes, and responds—all in continuous flow
2. AI response streams token-by-token to TTS as it's generated
3. Conversation maintains context within a session (follow-up questions work)
4. 4-6 distinct voice options are available for selection
5. Ultra-low-latency TTS option available for immediate feedback scenarios
6. Transcript display shows conversation history

**Plans:** 3 plans

- [x] 02-01-PLAN.md — Voice Cards UI and Transcript Panel
- [ ] 02-02-PLAN.md — NVIDIA API LLM Integration with Sentence Streaming
- [ ] 02-03-PLAN.md — Session State Management

---

### Phase 3: Conversation Flow & Voice Features

**Goal:** Natural conversation with interruption handling and voice cloning

**Depends on:** Phase 2

**Requirements:** CONV-04, CONV-05, CLONE-01, CLONE-02, CLONE-03, CLONE-04, UI-04, UI-05, DESK-03

**Success Criteria** (what must be TRUE):

1. User can interrupt TTS response mid-generation (barge-in)
2. TTS stops immediately when user starts speaking
3. User can upload 2-15 second audio sample to clone a voice
4. Cloned voice is immediately available for TTS output
5. Multiple cloned voices can be saved and selected
6. Voice selection dropdown with preview capability
7. Settings panel for voice cloning and preferences
8. Global hotkey activates voice input from anywhere

**Plans:** TBD

---

### Phase 4: Polish & Desktop Integration

**Goal:** Production-ready desktop app with system tray and reliability features

**Depends on:** Phase 3

**Requirements:** DESK-02

**Success Criteria** (what must be TRUE):

1. Application runs in system tray for background operation
2. Graceful handling when services are unavailable (fallback messages)

**Plans:** TBD

---

## Coverage

| Phase | Requirements | Status |
|-------|--------------|--------|
| 1 - Core Audio Pipeline | 16 | Complete |
| 2 - Full Conversation Pipeline | 9 | In Progress (1/3 plans) |
| 3 - Conversation Flow & Voice Features | 8 | Not started |
| 4 - Polish & Desktop Integration | 1 | Not started |

**Total:** 34/34 requirements mapped ✓

---

## Dependencies

```
Phase 1 ─────┬─────► Phase 2 ─────┬─────► Phase 3 ─────┬─────► Phase 4
             │                    │                    │
             │                    │                    │
(Foundation) │  (STT→LLM→TTS)     │  (Interruption)   │  (Production)
             │                    │  (Voice Cloning)  │
```

---

*Roadmap created: 2026-03-02*
