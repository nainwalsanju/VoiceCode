# Phase 2: Core Voice I/O - Summary

**Status:** Ready to Execute  
**Plans:** 4 (02-01, 02-02, 02-03, 02-04)

## Overview

Implement voice dictation and TTS output using Pocket TTS and Whisper.

## Plans

### 02-01: Integrate Pocket TTS
- Install Pocket TTS package
- Create TTS service module
- Implement TTS generation endpoint
- Test audio generation

### 02-02: Streaming TTS
- Add streaming support to TTS service
- Create streaming endpoint
- Build frontend audio service
- Test streaming playback

### 02-03: Set Up Whisper STT
- Install Whisper (or faster-whisper)
- Create STT service module
- Implement transcription endpoint
- Test transcription

### 02-04: Audio Pipeline
- Create audio capture hook
- Build real-time transcription service
- Create dictation UI component
- Integrate voice button with pipeline

## Dependencies

- **02-01** → Phase 1 complete (first in phase 2)
- **02-02** → 02-01 (needs TTS working)
- **02-03** → Independent (can run parallel)
- **02-04** → 02-02 + 02-03 (needs both streaming and STT)

## Expected Outcomes

- Pocket TTS generates speech from text
- TTS streams with low latency
- Whisper transcribes speech to text
- Complete dictation workflow: speak → transcribe → display
- Voice button with visual feedback
