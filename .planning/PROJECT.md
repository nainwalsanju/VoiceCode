# VoiceCode

## What This Is

A two-way conversational voice assistant application where users speak, their voice is transcribed to text in near real-time, an AI agent processes the text and performs tasks, and the response is spoken back using fast streaming text-to-speech. Users can also clone any voice for the TTS output.

## Core Value

Users can have natural, real-time voice conversations with an AI assistant, with the ability to customize the assistant's voice by cloning any person's voice.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Real-time speech-to-text (STT) - near-instant transcription as user speaks
- [ ] AI agent processing - agent receives transcribed text and performs actions
- [ ] Fast streaming text-to-speech (TTS) - streams audio response like ChatGPT/Perplexity/Gemini mobile apps
- [ ] Voice cloning - user can clone any voice for TTS output
- [ ] Two-way conversation flow - speak → STT → agent → TTS → response

### Out of Scope

- Multi-language support (English-only initially)
- Video capability
- Custom agent customization UI

## Context

This appears to be an existing project with code in src/, backend/, and src-tauri/. The project may have some existing implementation but needs structured planning for the voice conversation features.

## Constraints

- **Performance**: STT must be near real-time, TTS must stream (not wait for full response)
- **Voice Quality**: TTS should sound natural and human-like
- **Platform**: Desktop application (based on existing src-tauri structure)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| STT approach | Need near real-time transcription for natural conversation | — Pending |
| TTS approach | Need streaming audio output similar to mobile AI assistants | — Pending |
| Voice cloning | Allow users to clone any voice for personalization | — Pending |

## Technology Stack Options

### STT (Speech-to-Text) - User Selectable

| Model | Latency | Requirements | Status |
|-------|---------|--------------|--------|
| **Moonshine v2** | ~80ms | CPU/Edge | Option |
| **Voxtral Mini 4B** | <500ms | WebGPU/Browser | Option |
| **Parakeet TDT 0.6B** | ~30ms | GPU (NVIDIA) | Option |

### TTS (Text-to-Speech) - User Selectable

| Model | Latency | Voice Cloning | Requirements | Priority |
|-------|---------|---------------|--------------|----------|
| **Qwen3-TTS** | 97ms | 3s sample | GPU recommended | 1 |
| **NeuTTS Air** | Real-time | Instant | CPU/GPU | 2 |
| **NeuTTS Nano** | Real-time | 3s sample | CPU/Edge | 3 |
| **PocketTTS** | ~200ms | 5s sample | CPU (2 cores) | 4 |
| **Kokoro** | ~100ms | Yes | GPU | 5 |

*All TTS options support voice cloning. Users can switch between engines.*

---
*Last updated: 2026-03-02 after initialization*
