# Phase 03: Conversation Flow & Voice Features - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Natural conversation with interruption handling (barge-in) and voice cloning. This phase enables:
1. User can interrupt TTS mid-generation by starting to speak
2. TTS stops immediately when user begins speaking
3. User can upload 2-15 second audio to clone a voice
4. Cloned voices are immediately available for TTS
5. Multiple cloned voices can be saved and selected
6. Voice selection dropdown with preview capability
7. Settings panel for voice cloning preferences
8. Global hotkey activates voice input from anywhere

</domain>

<decisions>
## Implementation Decisions

### Interruption Behavior
- When user starts speaking during TTS: immediately cancel audio playback (no fade-out)
- Partial response text is retained in transcript for context
- Session state transitions: SPEAKING → LISTENING (already supported in sessionStore)
- VAD detection triggers interruption - no manual "stop" button needed

### Voice Preview UX
- Preview button next to each voice in selector dropdown
- Click to play a short sample phrase ("Hello, this is a voice preview")
- Auto-stop preview when another preview is started
- Cloned voices: use the uploaded sample as preview audio

### Cloned Voice Storage
- Backend stores cloned voice profiles (API already exists: voiceProfilesApi)
- Local cache for quick loading
- Profiles persist across sessions via backend storage
- Voice profiles tied to user session (no auth yet, so local to device)

### Global Hotkey Behavior
- Toggle mode: press once to start listening, press again to stop
- Visual indicator: window flashes or shows pulse when hotkey activates
- If already in conversation: hotkey cancels current operation and returns to IDLE
- Default hotkey: Ctrl+Shift+V (configurable in settings)

### Settings Panel Layout
- Voice cloning stays in separate "VOCAL_PROFILES" view (already implemented)
- Settings panel gets: hotkey configuration, default voice selection
- Keep existing UI structure - add hotkey activation to voice button area

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sessionStore.ts`: State machine with SPEAKING→LISTENING transition already defined
- `useGlobalHotkey.ts`: Tauri global shortcut registration implemented
- `VoiceCloneForm.tsx`: Complete voice cloning form with record/upload
- `VoiceProfileList.tsx`: Lists saved voice profiles
- `VoiceSelector.tsx`: Voice selection dropdown in header
- `SettingsPanel.tsx`: Hotkey input field already present

### Established Patterns
- Zustand for state management (persist middleware available)
- Tailwind CSS with cyberpunk theme (font-mono, uppercase, neon effects)
- Tauri plugins for desktop integration (@tauri-apps/plugin-global-shortcut)
- Backend API pattern: `src/api/*.ts` files with fetch wrappers

### Integration Points
- `VoiceButton.tsx`: Main voice input button - needs hotkey integration
- `sessionStore.ts`: Add interruption logic to detect user speech during SPEAKING
- Backend TTS service: Needs endpoint to cancel active TTS stream
- `VoiceSelector.tsx`: Add preview buttons for each voice

</code_context>

<specifics>
## Specific Ideas

- Interruption should feel instant - no audio artifacts or clicks
- Hotkey activation should show visual feedback (pulse animation on window)
- Voice preview should use consistent sample phrase across all voices
- Cloned voices should be clearly distinguished from built-in voices in UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 03-conversation-flow-voice-features*
*Context gathered: 2026-03-03*
