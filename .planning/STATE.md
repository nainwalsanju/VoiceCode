# VoiceCode State

**Last updated:** 2026-03-02

## Project Reference

**Core Value:** Users can have natural, real-time voice conversations with an AI assistant, with the ability to customize the assistant's voice by cloning any person's voice.

**Current Focus:** Phase 1: Core Audio Pipeline

---

## Current Position

| Attribute | Value |
|-----------|-------|
| **Phase** | 1 - Core Audio Pipeline |
| **Plan** | Not started |
| **Status** | Not started |
| **Progress** | 0% |

---

## Roadmap Progress

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Core Audio Pipeline | 0/3 | Not started | - |
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
| Use cascaded STT→LLM→TTS architecture | Proven reliability, component flexibility | Pending tech selection |
| Deepgram Nova-3 for STT | 247ms median, 1.62% WER | Researched |
| Inworld TTS-1.5-Max for primary TTS | ELO 1160, sub-250ms P90 | Researched |
| Cartesia Sonic 3 for low-latency | 40ms time-to-first-audio | Researched |
| Inworld for voice cloning | Free with TTS API, zero-shot | Researched |
| Tauri for desktop | Existing src-tauri, Rust backend | Researched |

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

**Ready for:** `/gsd-plan-phase 1`

**Next steps:**
1. Plan Phase 1 (Core Audio Pipeline)
2. Execute Phase 1 plans
3. Validate audio pipeline before moving to Phase 2

---

*State tracked for session continuity*
