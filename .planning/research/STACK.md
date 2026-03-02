# Technology Stack

**Project:** VoiceCode
**Researched:** March 2026
**Focus:** Real-time voice assistant with STT, streaming TTS, and voice cloning

## Recommended Stack

### Speech-to-Text (STT)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Deepgram Nova-3** | Latest | Primary STT API | Fastest median TTFS (247ms) with 1.62% semantic WER. Supports finalization for accurate turn detection. Pareto frontier for latency/accuracy. |
| **ElevenLabs Scribe v2 Realtime** | v2 | Alternative STT | Announced Feb 2026 - under 150ms latency. New entrant, excellent for voice agents. |
| **Moonshine** | v0.0.49 | Open-source local STT | Fastest open-source ASR for edge devices (Feb 2026 release). 5938 stars, active development. Good for offline mode. |
| **RealtimeSTT** | v0.3.104 | Python local library | Robust low-latency STT with voice activity detection. 9499 stars, actively maintained. |

**Recommendation:** Use **Deepgram Nova-3** as primary (best latency/accuracy balance). Consider **Moonshine** for offline/self-hosted scenarios.

**Confidence:** HIGH - Benchmarked by Daily.co in Feb 2026 with real-world data.

### Text-to-Speech (TTS)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Inworld TTS-1.5-Max** | 1.5 | Primary TTS API | #1 on Artificial Analysis (ELO 1160). Sub-250ms P90 latency. $10/1M chars. Best price-performance (116 ELO/$). |
| **Inworld TTS-1.5-Mini** | 1.5 | Ultra-low latency | Sub-130ms P90 latency. $5/1M chars. For latency-critical paths. |
| **Cartesia Sonic 3** | 3 | Fastest TTFA | 40ms time-to-first-audio (fastest in industry). State Space Model architecture. Good for immediate feedback. |
| **ElevenLabs** | v3 | Premium voice quality | 380+ voices, 70+ languages. Higher quality but 20x more expensive ($206/1M chars). Good for content production. |
| **Kokoro 82M** | v1.0 | Open-source TTS | Highest-ranked open-weight model (ELO 1059). $0.70/1M chars. Self-host for cost savings. |

**Recommendation:** Use **Inworld TTS-1.5-Max** as primary (best overall). Add **Cartesia Sonic 3** for immediate feedback (first words before full response). Fall back to **Kokoro** for self-hosted低成本方案.

**Confidence:** HIGH - Independent benchmarks from Artificial Analysis and Daily.co verify claims.

### Voice Cloning

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Inworld Zero-shot** | - | Instant cloning | Free. Clone from 2-15 seconds audio. No per-clone fees. Part of TTS API. |
| **Cartesia** | - | Instant cloning | 3-second sample. Part of Sonic 3 API. |
| **Qwen3-TTS** | - | Open-source cloning | 3-second cloning. Apache 2.0 license. 97ms latency. Self-host option. |
| **ElevenLabs** | - | Professional cloning | Higher quality but expensive. 30+ min audio required for best results. |

**Recommendation:** Use **Inworld** (free, included with TTS). **Qwen3-TTS** for self-hosted open-source option.

**Confidence:** HIGH - All options verified active in 2026.

### Audio Processing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Silero VAD** | Latest | Voice Activity Detection | Detect speech boundaries. Used in Pipecat benchmark. Better than cloud VAD for turn detection. |
| **Krisp VIVA** | Latest | Turn detection | Production-grade turn-taking for voice agents. SDK available. |
| **Pipecat** | 0.0.102+ | Voice agent framework | Open-source framework (Daily.co). STT/TTS orchestration, latency configuration, pipeline management. |

**Recommendation:** **Silero VAD** for turn detection. **Pipecat** for orchestration.

**Confidence:** MEDIUM - Well-documented but requires integration work.

### Infrastructure

| Technology | Purpose | Why |
|------------|---------|-----|
| **WebSocket** | Real-time streaming | Required for streaming STT/TTS. All recommended APIs support WebSocket. |
| **Cloudflare Workers/AWS Lambda** | Edge processing | Reduce latency by processing close to user. |
| **Tauri** | Desktop app framework | Existing src-tauri structure. Rust backend for performance. |

**Confidence:** HIGH - Standard patterns for voice applications.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| STT API | Deepgram Nova-3 | AssemblyAI | Deepgram faster (247ms vs 300ms+) on median. Better P95. |
| STT API | Deepgram Nova-3 | Google Cloud STT | Higher latency, more expensive for real-time. |
| TTS API | Inworld TTS-1.5-Max | ElevenLabs | 20x more expensive ($206 vs $10/M chars). Quality similar. |
| TTS API | Inworld TTS-1.5-Max | OpenAI TTS-1 | Lower quality (ELO 1106 vs 1160), similar latency. |
| Open-source STT | Moonshine | Whisper Large V3 | Moonshine specifically optimized for edge/low-latency. |
| Open-source TTS | Kokoro 82M | Coqui XTTS v2 | Kokoro higher quality (ELO 1059 vs 915), cheaper to run. |

## Installation

```bash
# Core dependencies
npm install @deepgram/sdk     # STT
npm install cartesia-sdk      # TTS (or use REST)
npm install websocket        # Streaming

# For local/ST self-hosted
pip install RealtimeSTT      # Python STT
pip install moonshine-voice  # Moonshine

# For voice agent orchestration
pip install pipecat-ai       # Framework

# For turn detection
pip install silero-vad       # Voice activity detection

# TTS open-source (for self-hosting)
pip install kokoro-tts       # Or use HuggingFace model
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│                   (Tauri Desktop App)                     │
└──────────────────────┬──────────────────────────────────┘
                       │ Audio Stream (WebSocket)
┌──────────────────────▼──────────────────────────────────┐
│                   Audio Transport                         │
│              (Capture + VAD + Chunking)                   │
└──────────────────────┬──────────────────────────────────┘
                       │ Streaming Audio
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌──────────┐
   │ Deepgram│   │  Moonshine│  │  Silero  │
   │  Nova-3│   │ (offline) │   │   VAD    │
   └────┬────┘   └─────┬─────┘   └────┬─────┘
        │              │              │
        └──────────────┼──────────────┘
                       │ Transcripts
                       ▼
              ┌─────────────────┐
              │  LLM Processing  │
              │   (AI Agent)     │
              └────────┬────────┘
                       │ Text Response
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Inworld  │  │ Cartesia  │  │  Kokoro  │
   │TTS-1.5-Max│ │  Sonic 3  │  │(offline) │
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │  Audio Output   │
              │  (Playback)     │
              └─────────────────┘
```

## Latency Targets

| Component | Target Latency | Recommended Solution |
|-----------|----------------|---------------------|
| STT (user speech → text) | <300ms median | Deepgram Nova-3 |
| STT P95 | <500ms | Deepgram Nova-3 |
| TTS (text → first audio) | <250ms | Inworld TTS-1.5-Max |
| TTS (text → first audio) | <130ms | Inworld TTS-1.5-Mini |
| TTS (extreme speed) | <50ms | Cartesia Sonic 3 |
| End-to-end (turn-taking) | <1 second | Combined pipeline |

## Sources

- **STT Benchmarks:** Daily.co (Feb 2026) - https://www.daily.co/blog/benchmarking-stt-for-voice-agents/
- **TTS Benchmarks:** Artificial Analysis Speech Leaderboard (Jan 2026) - https://artificialanalysis.ai/text-to-speech
- **Inworld TTS Data:** Inworld AI benchmarks (Jan 2026) - https://inworld.ai/resources/best-voice-ai-tts-apis-for-real-time-voice-agents-2026-benchmarks
- **Cartesia Sonic 3:** Official docs (Feb 2026) - https://docs.cartesia.ai/build-with-cartesia/tts-models/latest
- **ElevenLabs Scribe v2:** Announcement (Feb 2026) - https://elevenlabs.io/blog/introducing-scribe-v2-realtime
- **Open Source STT:** Moonshine GitHub (Feb 2026) - https://github.com/moonshine-ai/moonshine
- **Open Source TTS:** Qwen3-TTS (Jan 2026) - https://qwen.ai/blog?id=qwen3tts-0115
- **Voice Cloning:** Inworld pricing - https://inworld.ai/pricing
