# SPEC.md — Project Specification

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: No code may be written until this spec is marked `FINALIZED`.

## Vision
VoiceCode is a cross-platform voice coding application designed to empower developers by enabling them to write code using voice commands. It aims to bridge the gap between creative thought and digital implementation through high-performance Speech-to-Text (STT) and custom Text-to-Speech (TTS) integration.

## Goals
1. **Seamless Voice Dictation** — Enable real-time, accurate code transcription.
2. **Customizable Voice Output** — Support for Edge TTS and personalized voice cloning via Pocket TTS.
3. **Powerful Command System** — Define and execute custom voice-triggered macros and actions.
4. **Premium User Experience** — A modern, glassmorphism-based UI that feels intuitive and responsive.

## Non-Goals (Out of Scope)
- Full IDE replacement (VoiceCode is an auxiliary tool).
- Native mobile applications (initial focus is Desktop/Web).
- Real-time collaborative voice coding (single-user focus).

## Constraints
- **Technical**: Must run on Windows (user's OS), using Tauri for the desktop shell.
- **Backend**: Python FastAPI with Faster Whisper for STT and Moonshine ONNX for optimized performance.
- **Frontend**: React + TypeScript + Tailwind CSS.

## Success Criteria
- [x] Functional real-time STT streaming.
- [x] Working voice cloning from audio samples.
- [x] Custom command definition and execution.
- [x] Polished Dark Mode UI with glassmorphism effects.

---

*Last updated: 2026-03-02*
