# VoiceCode 🎤

A cross-platform voice coding application that enables developers to write code using voice commands, with TTS feedback and voice cloning capabilities.

## Features

- **Voice Dictation** - Speak and your words appear as text
- **Text-to-Speech (TTS)** - Hear your code read aloud with Edge TTS
- **Voice Cloning** - Create custom voices from audio samples using Pocket TTS
- **Voice Commands** - Define custom voice commands via UI
- **Modern UI** - Beautiful glassmorphism interface

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Shell | Tauri 2.x (Rust) |
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Python FastAPI |
| TTS | Edge TTS + Pocket TTS |
| STT | Faster Whisper |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Rust (for Tauri)

### Installation

1. **Clone the repository**
```bash
cd voicecode
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Set up Python virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

4. **Start the development servers**

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Backend:
```bash
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

5. **Open the app**
```
http://localhost:1420
```

## Usage

### Voice Dictation
1. Click the microphone button to start recording
2. Speak your code/text
3. Text appears in real-time
4. Edit or copy the result

### Voice Profiles
1. Go to "Voices" tab
2. Upload an audio sample (15-20 seconds)
3. Give it a name and save
4. Select it from the voice dropdown

### Voice Commands
1. Go to "Commands" tab
2. Click "Create Command"
3. Define trigger phrase and action
4. Test in the "Test" tab

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tts/generate` | POST | Generate TTS audio |
| `/tts/voices` | GET | Get available voices |
| `/stt/transcribe` | POST | Transcribe audio |
| `/stt/stream` | WS | Real-time STT |
| `/voice-profiles` | GET/POST | Manage voice profiles |
| `/voice/clone` | POST | Clone a voice |
| `/commands` | GET/POST | Manage commands |
| `/commands/execute` | POST | Execute command |
| `/settings` | GET/PUT | App settings |

## Building for Production

```bash
# Build frontend
npm run build

# Build Tauri app
cd src-tauri
cargo build --release
```

The app will be at `src-tauri/target/release/bundle/macos/voicecode.app`

## Project Structure

```
voicecode/
├── src/                  # React frontend
│   ├── components/      # UI components
│   ├── hooks/           # React hooks
│   ├── api/             # API clients
│   └── store/           # State management
├── backend/             # Python FastAPI
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── models/          # Data models
├── src-tauri/           # Tauri Rust code
└── data/                # Persistent data
```

## License

MIT
