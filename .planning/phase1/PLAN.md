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

1. **Tauri Desktop Shell Setup** ✅ ALREADY DONE
   - Already configured with microphone permissions

2. **Audio Capture Pipeline** ✅ ALREADY DONE
   - VoiceButton.tsx captures audio via WebAudio API
   - Streaming to backend via WebSocket

3. **Window Controls** ✅ ALREADY DONE
   - Native window controls configured

**Status:** COMPLETE

---

### Plan 2: Speech-to-Text Pipeline

**Purpose:** Integrate STT engines for real-time transcription

**Tasks:**

4. **Moonshine v2 Integration** ✅ ALREADY DONE
   - Already working via useful-moonshine-onnx
   - File: `backend/services/stt_stream_service.py`

5. **Add Parakeet TDT Support** 🔄 PENDING
   - Files: `backend/services/stt_service.py`, `stt_stream_service.py`
   - Action: Add parakeet-tdt library support

6. **Add Voxtral Mini 4B Support** 🔄 PENDING
   - Files: `backend/services/stt_service.py`
   - Action: Add voxtral integration

7. **Transcription Display** ✅ ALREADY DONE
   - VoiceButton receives transcriptions via WebSocket

**Status:** 3/7 complete

---

### Plan 3: Text-to-Speech Pipeline

**Purpose:** Integrate TTS engines with streaming

**Tasks:**

8. **Qwen3-TTS Integration** 🔄 PENDING
   - Files: `backend/services/tts_service.py`
   - Action: Install qwen-tts, implement actual model loading

9. **NeuTTS Air Integration** 🔄 PENDING
   - Files: `backend/services/tts_service.py`
   - Action: Add neutts-air library support

10. **NeuTTS Nano Integration** 🔄 PENDING
    - Files: `backend/services/tts_service.py`
    - Action: Add neutts library support

11. **PocketTTS Integration** 🔄 PENDING
    - Files: `backend/services/tts_service.py`
    - Action: Add pocket-tts library support

12. **Kokoro Integration** 🔄 PENDING
    - Files: `backend/services/tts_service.py`
    - Action: Add kokoro library support

13. **Audio Playback** ✅ ALREADY DONE
    - VoiceButton.tsx streams TTS chunks via AudioContext

**Status:** 1/13 complete

---

### Plan 4: UI & State Machine

**Purpose:** Connect components with state management and UI

**Tasks:**

14. **State Machine** ✅ ALREADY DONE
    - VoiceButton has: idle, connecting, listening, speaking, error states

15. **Visual Indicators** ✅ ALREADY DONE
    - VoiceButton shows animated rings, status text

16. **Voice Activation** ✅ ALREADY DONE
    - Push-to-talk via button click

**Status:** COMPLETE

---

## Implementation Notes

- Use Deepgram Nova-3 for STT (247ms median latency, interim results support)
- Use Inworld TTS-1.5-Max for TTS (sub-250ms P90, streaming support)
- Use Silero VAD for edge-based voice detection
- Stream everything at every layer to minimize latency
- Pause VAD during TTS playback to prevent echo

---

*Plan created: 2026-03-02*
*Updated: 2026-03-02 after codebase review*
