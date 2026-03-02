# Project Research Summary

**Project:** VoiceCode
**Domain:** Real-time Voice Assistant (Desktop Application)
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

VoiceCode is a real-time voice assistant desktop application that combines speech-to-text (STT), large language models (LLMs), and streaming text-to-speech (TTS) in a latency-sensitive pipeline. Based on extensive research, the recommended approach uses a classic cascaded architecture (STT → LLM → TTS) with streaming at every layer to achieve sub-second end-to-end latency. The primary differentiator is voice cloning capability, which allows users to create custom TTS voices from short audio samples.

The critical success factors are: (1) achieving <800ms end-to-end latency through parallel processing, (2) implementing proper interruption handling for natural conversation flow, and (3) configuring Voice Activity Detection (VAD) adaptively for real-world environments. The stack leverages Deepgram Nova-3 for STT (247ms median), Inworld TTS-1.5-Max for TTS (sub-250ms P90), and Inworld for free voice cloning. Desktop deployment via Tauri provides native audio access and WebRTC integration.

Key risks include underestimating cumulative pipeline latency, failing to handle user interruptions gracefully, and VAD misconfiguration causing truncated speech or false activations. These must be addressed early in development as they are foundational—retrofitted fixes are painful and expensive.

## Key Findings

### Recommended Stack

**Core technologies:**
- **Deepgram Nova-3** — Primary STT with 247ms median TTFS and 1.62% semantic WER. Best latency/accuracy balance.
- **Inworld TTS-1.5-Max** — Primary TTS with ELO 1160 (highest), sub-250ms P90 latency, $10/1M chars.
- **Cartesia Sonic 3** — Extreme low-latency TTS (40ms time-to-first-audio) for immediate feedback scenarios.
- **Inworld Zero-shot** — Voice cloning from 2-15 seconds audio, free with TTS API.
- **Silero VAD** — Voice activity detection for turn-taking, better than cloud VAD for edge detection.
- **Pipecat** — Open-source voice agent framework (Daily.co) for STT/TTS orchestration.
- **Tauri** — Desktop framework leveraging existing src-tauri with Rust backend for performance.

### Expected Features

**Must have (table stakes):**
- Real-time STT — Near-instant transcription as user speaks, <500ms latency
- Streaming TTS — Audio plays progressively from first word generated
- Multiple voice options — 4-6 voices with different personalities
- Low latency response — Sub-second end-to-end pipeline
- Conversation turn detection — Know when user finished vs paused
- Continuous conversation — Multiple exchanges without re-triggering

**Should have (competitive):**
- Voice cloning — **Core differentiator** for VoiceCode; clone any voice for TTS output
- Advanced interruption handling (barge-in) — User can interrupt mid-response
- Context memory — Remembers preferences across sessions

**Defer (v2+):**
- Deep app integration — Calendar, email, smart home (high complexity)
- Multi-language support — Focus on English-only initially
- Visual components — Audio-first is core

### Architecture Approach

The classic cascaded pipeline (ASR + LLM + TTS) is recommended for initial development due to proven reliability, component flexibility, and extensive tooling. Streaming at every layer (STT interim results, LLM token streaming, TTS audio chunks) is mandatory for natural conversation. Major components: Audio Input (microphone), VAD (speech detection), STT (Deepgram/Whisper), LLM (GPT-4o/Claude), TTS (ElevenLabs/Cartesia), Voice Cloning, Agent Logic, and WebRTC Transport (LiveKit). State machine: IDLE → LISTENING → PROCESSING → SPEAKING → IDLE.

### Critical Pitfalls

1. **End-to-end latency underestimation** — Cumulative delay >2s breaks conversation flow. Prevention: Design for worst-case, stream everything, parallel processing.
2. **Failure to handle user interruptions** — Users feel ignored when can't interrupt. Prevention: Coordinate VAD with in-flight LLM/TTS, halt audio immediately on speech detection.
3. **VAD misconfiguration** — Truncated speech, missed detection, or false activations. Prevention: Adaptive thresholds, user-facing sensitivity controls, multi-environment testing.
4. **No audio streaming pipeline** — Buffer underruns, dropped frames, degraded long conversations. Prevention: Robust buffering, reconnection logic, health checks.
5. **Acoustic echo and feedback** — Assistant triggers on its own TTS. Prevention: AEC (acoustic echo cancellation), headphone usage, proper audio routing.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Audio Pipeline
**Rationale:** Without functioning audio I/O and VAD, nothing else matters. This phase establishes the foundational infrastructure.
**Delivers:** Audio capture, VAD, STT integration, basic TTS playback, WebRTC transport layer.
**Addresses:** Real-time STT, streaming TTS, voice activity detection, continuous conversation foundation.
**Avoids:** Pitfall #3 (VAD misconfiguration), Pitfall #4 (no audio streaming pipeline).

### Phase 2: Core Conversation Pipeline
**Rationale:** With audio infrastructure ready, connect STT → LLM → TTS into full pipeline. This is where latency becomes critical.
**Delivers:** Full streaming pipeline (STT interim → LLM streaming → TTS chunks), session state management.
**Addresses:** Low latency response, turn detection, continuous conversation.
**Avoids:** Pitfall #1 (latency underestimation), Pitfall #7 (sequential processing).

### Phase 3: Conversation Flow & Interruption
**Rationale:** Natural conversation requires interruption handling—users must be able to stop unwanted responses.
**Delivers:** Barge-in detection, interruption pipeline (stop TTS, cancel LLM, route to STT), turn-taking signals.
**Addresses:** Advanced interruption handling.
**Avoids:** Pitfall #2 (no interruption handling), Pitfall #9 (poor turn-taking dynamics).

### Phase 4: Voice Features
**Rationale:** Voice cloning is the core differentiator. Requires legal compliance work alongside technical implementation.
**Delivers:** Voice cloning from audio samples, multiple voice options, voice settings UI.
**Addresses:** Voice cloning (differentiator), multiple voice options.
**Avoids:** Pitfall #6 (voice cloning legal/ethical issues), Pitfall #10 (missing transcript management).

### Phase 5: Polish & Reliability
**Rationale:** Production-ready requires fallbacks, error handling, configuration management.
**Delivers:** Circuit breakers, fallback providers, adaptive VAD tuning, transcript display, configuration UI.
**Addresses:** Context memory, graceful error handling.
**Avoids:** Pitfall #8 (no fallback mechanisms), Pitfall #11 (hardcoded timeouts), Pitfall #12 (TTS quality).

### Phase Ordering Rationale

- Phases 1-3 build the core voice conversation capability in dependency order: audio → pipeline → conversation flow.
- Voice cloning (Phase 4) builds on the TTS infrastructure established in Phase 2.
- Reliability (Phase 5) comes last because it optimizes an existing working system.
- This order avoids critical pitfalls: latency (P1-2), interruptions (P3), legal issues (P4), reliability (P5).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** WebRTC configuration details—may need LiveKit vs self-hosted decision
- **Phase 3:** Interruption handling specifics—complex state machine, needs API research
- **Phase 4:** Voice cloning compliance—emerging regulations (EU AI Act, California VCPA) need legal research

Phases with standard patterns (skip research-phase):
- **Phase 2:** Well-documented streaming pipeline patterns from Pipecat/LiveKit
- **Phase 5:** Standard reliability patterns (circuit breakers, fallbacks)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Benchmarked by Daily.co (Feb 2026), Artificial Analysis. Clear recommendations with versions. |
| Features | HIGH | Well-documented across ChatGPT Voice, Gemini Live, Perplexity Voice. Voice cloning is clear differentiator. |
| Architecture | HIGH | Standard cascaded pattern, extensive documentation from LiveKit, Pipecat, AssemblyAI. |
| Pitfalls | HIGH | Multiple authoritative sources (Picovoice, VoAgents, Deepgram) catalog these issues. |

**Overall confidence:** HIGH

### Gaps to Address

- **LLM provider decision:** Research focused on STT/TTS; need to finalize LLM choice (OpenAI GPT-4o vs Claude) during Phase 2 planning.
- **LiveKit vs self-hosted:** Phase 1 needs decision on WebRTC infrastructure—Cloud vs self-hosted affects architecture.
- **Voice cloning regulations:** Emerging EU AI Act and US state laws (California VCPA, Tennessee VBPA) need legal consultation before Phase 4.
- **Desktop-specific audio:** Research is Web-focused; may need additional research on Tauri audio APIs for echo cancellation.

## Sources

### Primary (HIGH confidence)
- Daily.co STT benchmarks (Feb 2026) — https://www.daily.co/blog/benchmarking-stt-for-voice-agents/
- Artificial Analysis TTS leaderboard (Jan 2026) — https://artificialanalysis.ai/text-to-speech
- Inworld TTS benchmarks (Jan 2026) — https://inworld.ai/resources/best-voice-ai-tts-apis-for-real-time-voice-agents-2026-benchmarks
- LiveKit Architecture — https://agentfactory.panaversity.org/docs/Building-Realtime-Voice-Agents/livekit-agents/livekit-architecture

### Secondary (MEDIUM confidence)
- Pipecat framework documentation — Voice agent orchestration patterns
- AssemblyAI Voice AI Stack — https://www.assemblyai.com/blog/the-voice-ai-stack-for-building-agents

### Tertiary (LOW confidence)
- Emerging voice cloning regulations (EU AI Act, California VCPA) — Needs legal consultation for Phase 4

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
