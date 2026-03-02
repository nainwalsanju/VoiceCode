# Phase 1 Plan: Core Audio Pipeline

## Overview

**Phase:** 1
**Goal:** Users can speak and receive audio responses through a working audio pipeline
**Dependencies:** None (first phase)

**Requirements:** AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, STT-01, STT-02, STT-03, STT-04, TTS-01, TTS-02, TTS-04, CONV-01, UI-01, UI-02, DESK-01, DESK-04

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
**Requirements:** AUDIO-01, AUDIO-03, DESK-01, DESK-04

**Tasks:**

1. **Tauri Desktop Shell Setup** ✅ ALREADY DONE
   - Requirements: DESK-01
   - Already configured with microphone permissions

2. **Audio Capture Pipeline** ✅ ALREADY DONE
   - Requirements: AUDIO-01, AUDIO-03
   - VoiceButton.tsx captures audio via WebAudio API
   - Streaming to backend via WebSocket

3. **Window Controls** ✅ ALREADY DONE
   - Requirements: DESK-04
   - Native window controls configured

**Status:** COMPLETE

---

### Plan 2: Voice Activity Detection & Turn Endpointing

**Purpose:** Detect when user starts/stops speaking and handle natural speech patterns
**Requirements:** AUDIO-02, STT-03, CONV-01

**Tasks:**

4. **Silero VAD Integration** 🔄 PENDING
   - Requirements: AUDIO-02
   - Files: `backend/services/vad_service.py`
   - Action: Integrate Silero VAD for voice activity detection
   - Verify: VAD triggers on speech start, detects silence after speech ends

5. **Turn Endpointing Logic** 🔄 PENDING
   - Requirements: CONV-01
   - Files: `backend/services/turn_detector.py`, `backend/routes/agent_stream.py`
   - Action: Implement logic to detect when user has finished speaking
   - Configurable silence threshold (500ms default)
   - Verify: System correctly identifies turn boundaries

6. **Natural Speech Pattern Handling** 🔄 PENDING
   - Requirements: STT-03
   - Files: `backend/services/stt_stream_service.py`
   - Action: Configure STT to handle pauses, disfluencies (ums, ahs)
   - Verify: Transcription handles natural speech without cutting off

**Status:** 0/3 complete

---

### Plan 3: Speech-to-Text Pipeline

**Purpose:** Integrate STT engines for real-time transcription
**Requirements:** STT-01, STT-02, STT-04

**Tasks:**

7. **Moonshine v2 Integration** ✅ ALREADY DONE
   - Requirements: STT-04
   - Already working via useful-moonshine-onnx
   - File: `backend/services/stt_stream_service.py`

8. **Add Parakeet TDT Support** 🔄 PENDING
   - Requirements: STT-01 (latency target)
   - Files: `backend/services/stt_service.py`, `stt_stream_service.py`
   - Action: Add parakeet-tdt library support (~30ms latency)

9. **Add Voxtral Mini 4B Support** 🔄 PENDING
   - Requirements: STT-01
   - Files: `backend/services/stt_service.py`
   - Action: Add voxtral integration

10. **Transcription Display** ✅ ALREADY DONE
    - Requirements: STT-02
    - VoiceButton receives transcriptions via WebSocket
    - Interim results displayed in real-time

**Status:** 2/4 complete

---

### Plan 4: Text-to-Speech Pipeline

**Purpose:** Integrate TTS engines with streaming
**Requirements:** TTS-01, TTS-02, TTS-04

**Tasks:**

11. **Qwen3-TTS Integration** 🔄 PENDING
    - Requirements: TTS-02, TTS-04
    - Files: `backend/services/tts_service.py`
    - Action: Install qwen-tts, implement actual model loading (97ms latency)

12. **NeuTTS Air Integration** 🔄 PENDING
    - Requirements: TTS-02
    - Files: `backend/services/tts_service.py`
    - Action: Add neutts-air library support (real-time, instant voice clone)

13. **NeuTTS Nano Integration** 🔄 PENDING
    - Requirements: TTS-02
    - Files: `backend/services/tts_service.py`
    - Action: Add neutts library support (edge devices, 120M params)

14. **PocketTTS Integration** 🔄 PENDING
    - Requirements: TTS-02
    - Files: `backend/services/tts_service.py`
    - Action: Add pocket-tts library support (CPU-only, ~200ms)

15. **Kokoro Integration** 🔄 PENDING
    - Requirements: TTS-02
    - Files: `backend/services/tts_service.py`
    - Action: Add kokoro library support (~100ms, best quality)

16. **Audio Playback** ✅ ALREADY DONE
    - Requirements: TTS-01
    - VoiceButton.tsx streams TTS chunks via AudioContext

**Status:** 1/6 complete

---

### Plan 5: UI & State Machine

**Purpose:** Connect components with state management and UI
**Requirements:** UI-01, UI-02

**Tasks:**

17. **State Machine** ✅ ALREADY DONE
    - Requirements: UI-02
    - VoiceButton has: idle, connecting, listening, speaking, error states

18. **Visual Indicators** ✅ ALREADY DONE
    - Requirements: UI-02
    - VoiceButton shows animated rings, status text

19. **Voice Activation** ✅ ALREADY DONE
    - Requirements: UI-01
    - Push-to-talk via button click

**Status:** COMPLETE

---

### Plan 6: Latency Verification

**Purpose:** Verify latency targets are met
**Requirements:** STT-01 (<500ms), TTS-02 (<250ms)

**Tasks:**

20. **STT Latency Test** 🔄 PENDING
    - Requirements: STT-01
    - Files: `tests/latency_stt_test.py`
    - Action: Create test to measure transcription latency
    - Target: <500ms from audio to text
    - Verify: Run `pytest tests/latency_stt_test.py`

21. **TTS Latency Test** 🔄 PENDING
    - Requirements: TTS-02
    - Files: `tests/latency_tts_test.py`
    - Action: Create test to measure TTS first-audio latency
    - Target: <250ms from text to first audio chunk
    - Verify: Run `pytest tests/latency_tts_test.py`

22. **End-to-End Pipeline Test** 🔄 PENDING
    - Requirements: STT-01, TTS-02
    - Files: `tests/e2e_latency_test.py`
    - Action: Create full pipeline latency test
    - Target: <1 second from speech start to audio response
    - Verify: Run `pytest tests/e2e_latency_test.py`

**Status:** 0/3 complete

---

## Coverage Summary

| Requirement | Task | Status |
|-------------|------|--------|
| AUDIO-01 | Task 2 | ✅ Complete |
| AUDIO-02 | Task 4 | 🔄 Pending |
| AUDIO-03 | Task 2 | ✅ Complete |
| AUDIO-04 | Task 16 | ✅ Complete |
| STT-01 | Tasks 7-9, 20 | 🔄 Partial |
| STT-02 | Task 10 | ✅ Complete |
| STT-03 | Task 6 | 🔄 Pending |
| STT-04 | Task 7 | ✅ Complete |
| TTS-01 | Task 16 | ✅ Complete |
| TTS-02 | Tasks 11-15, 21 | 🔄 Partial |
| TTS-04 | Task 11 | 🔄 Pending |
| CONV-01 | Task 5 | 🔄 Pending |
| UI-01 | Task 19 | ✅ Complete |
| UI-02 | Tasks 17-18 | ✅ Complete |
| DESK-01 | Task 1 | ✅ Complete |
| DESK-04 | Task 3 | ✅ Complete |

**Progress:** 10/16 requirements complete (62.5%)

---

## Implementation Notes

- Use Moonshine v2 for STT (~80ms, CPU) - Already working
- Use Qwen3-TTS for TTS (97ms latency, 3s voice cloning) - Primary target
- Use Silero VAD for edge-based voice detection
- Stream everything at every layer to minimize latency
- Pause VAD during TTS playback to prevent echo
- Turn endpointing uses configurable silence threshold (500ms default)

---

*Plan created: 2026-03-02*
*Updated: 2026-03-02 after verification - added VAD, endpointing, latency tests*
