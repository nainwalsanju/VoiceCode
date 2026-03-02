# VoiceCode State

**Last updated:** 2026-03-02T18:25:00Z

## Project Reference

**Core Value:** Users can have natural, real-time voice conversations with an AI assistant, with the ability to customize the assistant's voice by cloning any person's voice.

**Current Focus:** Phase 1: Core Audio Pipeline

---

## Current Position

| Attribute | Value |
|-----------|-------|
| **Phase** | 1 - Core Audio Pipeline |
| **Plan** | Core Audio Pipeline |
| **Status** | Completed |
| **Progress** | 100% |

---

## Roadmap Progress

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Core Audio Pipeline | 3/3 | ✅ Complete | 11 tasks |
| 2 | Full Conversation Pipeline | 0/3 | Not started | - |
| 3 | Conversation Flow & Voice Features | 0/3 | Not started | - |
| 4 | Polish & Desktop Integration | 0/2 | Not started | - |

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| End-to-end latency | <800ms | - |
| STT latency | <500ms | - |
| TTS time-to-first-audio | <250ms | - |
| Requirement coverage | 100% | 34/34 ✓ |

---

## Accumulated Context

### Key Decisions Made

| Decision | Rationale | Status |
|----------|-----------|--------|
| Use cascaded STT→LLM→TTS architecture | Proven reliability, component flexibility | ✅ Implemented |
| Silero VAD for voice detection | Industry-standard edge VAD | ✅ Implemented |
| Moonshine v2 for STT | ~80ms latency, CPU-friendly | ✅ Implemented |
| Qwen3-TTS for primary TTS | 97ms latency, voice cloning | ✅ Implemented |
| 5 TTS engines available | Qwen3, NeuTTS Air/Nano, PocketTTS, Kokoro | ✅ Implemented |
| Configurable turn endpointing | 500ms silence default, adaptive threshold | ✅ Implemented |
| Natural speech handling | Filler word removal, turn completion | ✅ Implemented |
| Tauri for desktop | Existing src-tauri, Rust backend | ✅ Verified |

### Technical Notes

- Streaming at every layer is mandatory for natural conversation
- State machine: IDLE → LISTENING → PROCESSING → SPEAKING → IDLE
- VAD configuration critical—adaptive thresholds needed

### Research Flags

- Phase 1: WebRTC configuration (LiveKit vs self-hosted)
- Phase 3: Interruption handling specifics
- Phase 4: Voice cloning compliance (EU AI Act, California VCPA)

---

## Session Continuity

**Ready for:** Phase 2: Full Conversation Pipeline

**Next steps:**
1. ✅ Complete Phase 1 (Core Audio Pipeline) - DONE
2. Plan Phase 2 (Full Conversation Pipeline)
3. Execute Phase 2 plans
4. Validate full conversation loop

---

*State tracked for session continuity*
