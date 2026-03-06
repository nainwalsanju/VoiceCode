# VoiceCode - High-Level Design

## 1. Overview

VoiceCode is a desktop voice coding application that enables users to dictate code, create voice commands, and use text-to-speech for audio feedback. It consists of a Tauri-based desktop client with a React frontend and a Python FastAPI backend.

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tauri Desktop App                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (UI)                     │  │
│  │  - Dictation View    - Voice Profiles    - Commands View   │  │
│  │  - Voice Selector    - Settings Panel   - Test Commands  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Zustand Store (State Management)              │  │
│  │  - Dictation Store    - App State     - Settings          │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (Python)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐  │
│  │     STT     │ │     TTS     │ │ Voice Clone │ │  Commands  │  │
│  │  Service    │ │  Service    │ │  Service    │ │  Executor  │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Data Layer (JSON Files)                  │ │
│  │  - voice_profiles.json  - voice_commands.json  - settings   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 3. Components

### 3.1 Frontend (React + TypeScript)

| Component | File | Description |
|-----------|------|-------------|
| App | `src/App.tsx` | Main application shell with navigation |
| VoiceButton | `src/components/VoiceButton.tsx` | Push-to-talk voice recording button |
| DictationDisplay | `src/components/DictationDisplay.tsx` | Displays transcribed text |
| VoiceProfileList | `src/components/VoiceProfileList.tsx` | Lists cloned voice profiles |
| VoiceCloneForm | `src/components/VoiceCloneForm.tsx` | Form to clone new voices |
| VoiceSelector | `src/components/VoiceSelector.tsx` | Dropdown to select TTS voice |
| CommandList | `src/components/CommandList.tsx` | Lists configured voice commands |
| CommandForm | `src/components/CommandForm.tsx` | Form to create voice commands |
| CommandTester | `src/components/CommandTester.tsx` | Interface to test voice commands |
| SettingsPanel | `src/components/SettingsPanel.tsx` | Application settings modal |

### 3.2 Frontend Hooks

| Hook | File | Description |
|------|------|-------------|
| useBackendStatus | `src/hooks/useBackendStatus.ts` | Monitors backend connection |
| useAudioCapture | `src/hooks/useAudioCapture.ts` | Handles audio recording |
| useGlobalHotkey | `src/hooks/useGlobalHotkey.ts` | Global hotkey registration |
| useWindowManagement | `src/hooks/useWindowManagement.ts` | Window control (minimize, close) |

### 3.3 Frontend API Client

| Module | File | Description |
|--------|------|-------------|
| client | `src/api/client.ts` | Axios HTTP client wrapper |
| voiceProfiles | `src/api/voiceProfiles.ts` | Voice profile CRUD API |
| commands | `src/api/commands.ts` | Voice command CRUD API |
| settings | `src/api/settings.ts` | Settings API |
| appState | `src/api/appState.ts` | App state sync API |

### 3.4 Backend Routes

| Route | File | Description |
|-------|------|-------------|
| `/tts` | `backend/routes/tts.py` | Text-to-speech synthesis |
| `/stt` | `backend/routes/stt.py` | Speech-to-text (batch) |
| `/stt/stream` | `backend/routes/stt_stream.py` | Streaming STT |
| `/voice` | `backend/routes/voice.py` | Voice processing |
| `/voice/profiles` | `backend/routes/voice_profiles.py` | Voice profile management |
| `/commands` | `backend/routes/commands.py` | Voice command management |
| `/settings` | `backend/routes/settings.py` | Application settings |
| `/app-state` | `backend/routes/app_state.py` | App state persistence |
| `/agent-stream` | `backend/routes/agent_stream.py` | Agent streaming |

### 3.5 Backend Services

| Service | File | Description |
|---------|------|-------------|
| STT Service | `backend/services/stt_service.py` | Faster Whisper STT |
| STT Stream Service | `backend/services/stt_stream_service.py` | Streaming STT |
| TTS Service | `backend/services/tts_service.py` | Edge TTS synthesis |
| Voice Clone Service | `backend/services/voice_clone_service.py` | Coqui XTTS voice cloning |
| Command Executor | `backend/services/command_executor.py` | Executes voice commands |

### 3.6 Data Models

| Model | File | Description |
|-------|------|-------------|
| VoiceProfile | `backend/models/voice_profile.py` | Cloned voice data |
| VoiceCommand | `backend/models/voice_command.py` | Voice command definition |
| Settings | `backend/models/settings.py` | Application settings |
| AppState | `backend/models/app_state.py` | Runtime app state |

## 4. Data Flow

### 4.1 Voice Dictation Flow
```
User presses VoiceButton → Audio capture (MediaRecorder) → 
WebSocket to /stt/stream → Backend streams to Faster Whisper → 
Transcription returned → Display in DictationDisplay
```

### 4.2 Voice Command Flow
```
User speaks → STT transcription → 
CommandExecutor.find_matching() → 
Match found → Execute action (shell, URL, clipboard, TTS)
```

### 4.3 TTS Flow
```
User selects voice → Text input → 
POST /tts → Edge TTS synthesis → 
Return audio stream → Play via Web Audio API
```

## 5. Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Tauri 2.x |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4 |
| State Management | Zustand |
| Backend | FastAPI (Python) |
| STT | Faster Whisper |
| TTS | Microsoft Edge TTS |
| Voice Cloning | Coqui XTTS |
| Logging | Structlog |

## 6. Storage

Data is persisted in JSON files under `data/`:

- `data/voice_profiles/voice_profiles.json` - Cloned voice profiles
- `data/commands/voice_commands.json` - Voice command definitions
- `data/settings.json` - Application settings
- `data/app_state.json` - Runtime application state
- `data/audio_samples/` - Uploaded voice samples for cloning

## 7. Key Features

1. **Voice Dictation** - Real-time speech-to-text using Faster Whisper
2. **Voice Cloning** - Clone custom voices using Coqui XTTS
3. **Voice Commands** - Create custom voice commands with various actions
4. **Text-to-Speech** - Convert text to speech using Edge TTS
5. **Command Testing** - Test voice commands without speaking
6. **Global Hotkeys** - Trigger voice recording via keyboard shortcuts
7. **Window Management** - Minimize to system tray, window controls

## 8. Configuration

- **Frontend**: `vite.config.ts`, `tsconfig.json`
- **Tauri**: `src-tauri/tauri.conf.json`
- **Backend**: Environment variables for service endpoints
