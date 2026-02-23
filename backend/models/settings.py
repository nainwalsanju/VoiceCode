import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog

logger = structlog.get_logger()

DATA_DIR = Path(__file__).parent.parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SETTINGS_FILE = DATA_DIR / "settings.json"

DEFAULT_SETTINGS = {
    "stt_provider": "google",
    "tts_voice": "en-US-Neural2-F",
    "tts_speed": 1.0,
    "tts_pitch": 1.0,
    "microphone": "",
    "hotkey": "Ctrl+Shift+V",
    "auto_start": False,
    "tts_enabled": True,
    "minimize_to_tray": True,
    "always_on_top": False,
    "language": "en-US",
    "silence_threshold": 0.5,
    "max_recording_duration": 30,
}


class AppSettings:
    def __init__(
        self,
        stt_provider: str = "google",
        tts_voice: str = "en-US-Neural2-F",
        tts_speed: float = 1.0,
        tts_pitch: float = 1.0,
        microphone: str = "",
        hotkey: str = "Ctrl+Shift+V",
        auto_start: bool = False,
        tts_enabled: bool = True,
        minimize_to_tray: bool = True,
        always_on_top: bool = False,
        language: str = "en-US",
        silence_threshold: float = 0.5,
        max_recording_duration: int = 30,
    ):
        self.stt_provider = stt_provider
        self.tts_voice = tts_voice
        self.tts_speed = tts_speed
        self.tts_pitch = tts_pitch
        self.microphone = microphone
        self.hotkey = hotkey
        self.auto_start = auto_start
        self.tts_enabled = tts_enabled
        self.minimize_to_tray = minimize_to_tray
        self.always_on_top = always_on_top
        self.language = language
        self.silence_threshold = silence_threshold
        self.max_recording_duration = max_recording_duration

    def to_dict(self) -> dict:
        return {
            "stt_provider": self.stt_provider,
            "tts_voice": self.tts_voice,
            "tts_speed": self.tts_speed,
            "tts_pitch": self.tts_pitch,
            "microphone": self.microphone,
            "hotkey": self.hotkey,
            "auto_start": self.auto_start,
            "tts_enabled": self.tts_enabled,
            "minimize_to_tray": self.minimize_to_tray,
            "always_on_top": self.always_on_top,
            "language": self.language,
            "silence_threshold": self.silence_threshold,
            "max_recording_duration": self.max_recording_duration,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AppSettings":
        return cls(
            stt_provider=data.get("stt_provider", DEFAULT_SETTINGS["stt_provider"]),
            tts_voice=data.get("tts_voice", DEFAULT_SETTINGS["tts_voice"]),
            tts_speed=data.get("tts_speed", DEFAULT_SETTINGS["tts_speed"]),
            tts_pitch=data.get("tts_pitch", DEFAULT_SETTINGS["tts_pitch"]),
            microphone=data.get("microphone", DEFAULT_SETTINGS["microphone"]),
            hotkey=data.get("hotkey", DEFAULT_SETTINGS["hotkey"]),
            auto_start=data.get("auto_start", DEFAULT_SETTINGS["auto_start"]),
            tts_enabled=data.get("tts_enabled", DEFAULT_SETTINGS["tts_enabled"]),
            minimize_to_tray=data.get(
                "minimize_to_tray", DEFAULT_SETTINGS["minimize_to_tray"]
            ),
            always_on_top=data.get("always_on_top", DEFAULT_SETTINGS["always_on_top"]),
            language=data.get("language", DEFAULT_SETTINGS["language"]),
            silence_threshold=data.get(
                "silence_threshold", DEFAULT_SETTINGS["silence_threshold"]
            ),
            max_recording_duration=data.get(
                "max_recording_duration", DEFAULT_SETTINGS["max_recording_duration"]
            ),
        )


class SettingsStore:
    def __init__(self, settings_file: Path = SETTINGS_FILE):
        self.settings_file = settings_file
        self._settings: AppSettings = AppSettings()
        self._load()

    def _load(self) -> None:
        if self.settings_file.exists():
            try:
                data = json.loads(self.settings_file.read_text())
                self._settings = AppSettings.from_dict(data)
                logger.info("settings_loaded")
            except Exception as e:
                logger.error("failed_to_load_settings", error=str(e))
                self._settings = AppSettings()
        else:
            self._settings = AppSettings()
            self._save()

    def _save(self) -> None:
        try:
            data = self._settings.to_dict()
            self.settings_file.write_text(json.dumps(data, indent=2))
            logger.info("settings_saved")
        except Exception as e:
            logger.error("failed_to_save_settings", error=str(e))
            raise

    def get(self) -> AppSettings:
        return self._settings

    def update(self, data: dict) -> AppSettings:
        current_dict = self._settings.to_dict()
        current_dict.update(data)
        self._settings = AppSettings.from_dict(current_dict)
        self._save()
        logger.info("settings_updated", updated_keys=list(data.keys()))
        return self._settings


_settings_store: Optional[SettingsStore] = None


def get_settings_store() -> SettingsStore:
    global _settings_store
    if _settings_store is None:
        _settings_store = SettingsStore()
    return _settings_store
