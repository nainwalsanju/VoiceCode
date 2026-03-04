---
phase: 11
plan: fix-tts-gaps
wave: 6
gap_closure: true
---

# Fix: TTS Reliability and Dependency Management

## Problem
During the v2.0 audit, two main concerns were identified:
1. `edge-tts` is executed as a child subprocess locally in some scratch scripts or failed to bind adequately when testing, breaking cross-platform guarantees.
2. The UI does not gracefully handle `tts_stream` silent failures. If audio generation fails on the backend, the frontend socket spins on "listening" or "processing" infinitely without providing standard fallback handling to the user.

## Root Cause
- Voice cloning iterations relied on local OS CLI access temporarily rather than `asyncio` bindings via the native package.
- The `AgentConnectionManager` pipeline lacks explicit error boundaries for sending explicit `{"type": "error"}` messages during chunk failures in the `audio_stream_generator`.

## Tasks

<task type="auto" status="done">
  <name>Migrate edge-tts to Python Async</name>
  <files>backend/services/tts_service.py</files>
  <action>Ensure `stream_audio_async` and `generate_audio_async` strictly use `edge_tts.Communicate(text, voice)` async generators instead of any subprocess abstractions.</action>
  <verify>Run the backend locally, clone an edge-tts voice, verify Python execution limits.</verify>
  <done>No child process tracking required.</done>
</task>

<task type="auto" status="done">
  <name>Implement TTS Failure Fallback UI</name>
  <files>backend/routes/agent_stream.py, src/components/DictationDisplay.tsx</files>
  <action>Build a fallback state that pushes an `error` payload over the WebSocket if generation fails, and ensure the UI renders a visible red alert or drops correctly to the `idle` state instead of hanging in `processing`.</action>
  <verify>Force a failure in TTS by passing an invalid `voice_id` and ensure UI recovers.</verify>
  <done>No infinite loading states.</done>
</task>
