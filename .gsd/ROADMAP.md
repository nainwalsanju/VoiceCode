# VoiceCode — Roadmap

> **Status**: `v2.0 In Progress`

## Phase 1: Foundation (Wave 1) ✓
- [x] 01-01: Project Setup & Tauri Config
- [x] 01-02: Backend Infrastructure (FastAPI)
- [x] 01-03: Frontend Basic Structure (React+Tailwind)

## Phase 2: Core Voice I/O (Wave 1) ✓
- [x] 02-01: STT Service (Faster Whisper)
- [x] 02-02: TTS Service (Edge TTS)
- [x] 02-03: Audio Capture Integration
- [x] 02-04: API Service Routes

## Phase 3: Voice Cloning (Wave 2) ✓
- [x] 03-01: Voice Profile Data Models
- [x] 03-02: Voice Cloning (Pocket TTS/Coqui)
- [x] 03-03: Voice Profile Management UI
- [x] 03-04: Voice Selection & Application

## Phase 4: Command System (Wave 2) ✓
- [x] 04-01: Command Trigger Parsing
- [x] 04-02: Command Execution Engine
- [x] 04-03: Command Management UI
- [x] 04-04: Command Testing Interface

## Phase 5: Settings & Polish (Wave 3) ✓
- [x] 05-01: Global Settings Management
- [x] 05-02: UI Polish (Glassmorphism & Fixed Layouts)
- [x] 05-03: Error Handling & UX Improvements
- [x] 05-04: Final Integration Testing

---

## Phase 6: Multi-Agent Core (Wave 4) ✓
- [x] 06-01: Agent Profile Data Models
- [x] 06-02: Agent Management API Routes
- [x] 06-03: Chat Data Models & SQLite/JSON Storage

## Phase 7: Orchestrator & Voice Linking (Wave 4) ✓
- [x] 07-01: Conversational Orchestrator (Multi-Agent LLM Routing)
- [x] 07-02: Voice Profile to Agent Linking
- [x] 07-03: TTS Injector Hook

## Phase 8: Conversational UI (Wave 5) ✓
- [x] 08-01: Chat Feed Component
- [x] 08-02: Agent Builder Sidebar
- [x] 08-03: Multi-Speaker Waveform Animations
- [x] 08-04: E2E Integration Testing

---

## Phase 9: UI Readability & Typography Polish (Wave 5)
- [ ] 09-01: Update Global Font Stack (Swap IBM Plex Sans for Inter/Outfit)
- [ ] 09-02: Eliminate Micro-Typography (Replace 8px/10px text with standard base sizes)
- [ ] 09-03: Reduce Extreme Tracking & Uppercase Density
- [ ] 09-04: Improve Contrast Ratios (Increase text opacities from 30-40% to 60-80%)

---

## Phase 10: Production-Ready Voice Cloning Integration (Wave 5) ✓
- [x] 10-01: Procurement/Generation of immaculate audio cloning sources
- [x] 10-02: Integrate cloned instances safely into TTS memory bounds
- [x] 10-03: Implement synchronous `/preview` UI API functionality
- [x] 10-04: E2E Browser Subagent Verification Matrix

---

## Phase 11: Gap Closure (Wave 6)
**Status**: ⬜ Not Started
**Objective**: Address technical debt gaps from v2.0 milestone audit

**Gaps to Close:**
- [ ] 11-01: Migrate `edge-tts` subprocess to native python bindings (`edge_tts.Communicate`)
- [ ] 11-02: Implement robust TTS failure fallback UI states for silent timeouts
