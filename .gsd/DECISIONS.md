# Architecture Decisions Log

> **Note:** This document tracks high-level technical decisions made during the development of VoiceCode.

## 2026-03-04: STT Backend Selection
- **Decision:** Default to using `useful-moonshine-onnx` alongside `faster-whisper`.
- **Context:** While Whisper is extremely accurate, Python version compatibility issues and memory management complexity on standard Windows machines make it prone to fail under extreme environments. Moonshine provides a significantly faster ONNX-based execution graph reducing transcription latency by >40% and limiting memory usage.
- **Consequences:** We must maintain ONNX abstractions instead of PyTorch specific graph variables, but we inherently secure the execution boundaries for Python 3.14+ without relying on nightly wheels.

## 2026-03-04: State Management
- **Decision:** Utilize Zustand for frontend state.
- **Context:** React Context API was found to be too slow given the aggressive chunking (250ms) during audio stream WebSocket transmissions, causing unnecessary re-renders in the heavy animated glassmorphism UI.
- **Consequences:** Stores are split natively into `sessionStore.ts`, `transcriptStore.ts`, and `voiceStore.ts` resulting in modular logic but requires careful subscription polling.

## 2026-03-04: Python Environment Strategy
- **Decision:** Native local environment using `.venv` instead of Docker containers.
- **Context:** The software natively ties into Tauri desktop hooks which makes audio device forwarding (Mic input, Speaker output) exceedingly complicated via Dockerized instances on standard Windows machines.
- **Consequences:** Requires users to maintain Python >3.11 themselves or compile a locked binary. Test architectures must be explicit in `backend/tests` and run locally (e.g., using `pytest`).
