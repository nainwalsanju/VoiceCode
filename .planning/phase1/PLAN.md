# Phase 1 Plan: Core Audio Pipeline

## Overview

**Phase:** 1
**Goal:** Users can speak and receive audio responses through a working audio pipeline
**Dependencies:** None (first phase)

## Success Criteria

1. User can speak and see their speech transcribed to text within 500ms
2. Interim transcription results appear while user is still speaking
3. TTS audio streams progressively (not waiting for full response)
4. First TTS audio plays within 250ms of response generation
5. Visual indicator clearly shows current state (listening, processing, speaking)
6. Desktop window controls (minimize, maximize, close) work correctly

## Plans

### Plan 1: Tauri Foundation & Audio Capture

**Purpose:** Set up desktop shell with microphone access

**Tasks:**

1. **Tauri Desktop Shell Setup**
   - Files: `src-tauri/`, `src/App.tsx`
   - Action: Configure Tauri with microphone permissions in `tauri.conf.json`
   - Verify: `npm run tauri dev` launches window with audio permission prompt

2. **Audio Capture Pipeline**
   - Files: `src/lib/audio/capture.ts`, `src-tauri/src/audio.rs`
   - Action: Implement real-time audio capture from microphone using web audio API
   - Verify: Audio chunks visible in devtools

3. **Window Controls**
   - Files: `src-tauri/tauri.conf.json`
   - Action: Configure native window controls
   - Verify: Minimize, maximize, close buttons work

**Status:** pending

---

### Plan 2: Speech-to-Text Pipeline

**Purpose:** Integrate Deepgram for real-time transcription

**Tasks:**

4. **Deepgram WebSocket Integration**
   - Files: `src/lib/stt/deepgram.ts`
   - Action: Connect to Deepgram Nova-3 via WebSocket, send audio chunks, receive transcription
   - Handle interim results and final transcription
   - Verify: Speak, see text appear within 500ms

5. **VAD Integration (Silero)**
   - Files: `src/lib/vad/silero.ts`
   - Action: Integrate Silero VAD to detect speech start/stop boundaries
   - Verify: VAD triggers on speech, detects silence after speech ends

6. **Transcription Display**
   - Files: `src/components/Transcript.tsx`
   - Action: Display transcription in real-time with interim and final states
   - Verify: Interim text appears while speaking

**Status:** pending

---

### Plan 3: Text-to-Speech Pipeline

**Purpose:** Integrate Inworld for streaming TTS

**Tasks:**

7. **Inworld TTS Integration**
   - Files: `src/lib/tts/inworld.ts`
   - Action: Integrate Inworld TTS-1.5-Max, send text, receive streaming audio
   - Verify: First audio plays within 250ms

8. **Audio Playback**
   - Files: `src/lib/audio/playback.ts`
   - Action: Handle TTS audio output through speakers with buffering
   - Verify: TTS audio audible through speakers

**Status:** pending

---

### Plan 4: UI & State Machine

**Purpose:** Connect components with state management and UI

**Tasks:**

9. **State Machine**
   - Files: `src/stores/conversation.ts`
   - Action: Implement state machine: IDLE → LISTENING → PROCESSING → SPEAKING
   - Verify: States transition correctly

10. **Visual Indicators**
    - Files: `src/components/StatusIndicator.tsx`
    - Action: Show visual indicator for each state
    - Verify: Indicator shows correct state throughout flow

11. **Voice Activation**
    - Files: `src/components/VoiceButton.tsx`
    - Action: Implement voice activation toggle
    - Verify: Button toggles listening mode on/off

**Status:** pending

---

## Implementation Notes

- Use Deepgram Nova-3 for STT (247ms median latency, interim results support)
- Use Inworld TTS-1.5-Max for TTS (sub-250ms P90, streaming support)
- Use Silero VAD for edge-based voice detection
- Stream everything at every layer to minimize latency
- Pause VAD during TTS playback to prevent echo

---

*Plan created: 2026-03-02*
