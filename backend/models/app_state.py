import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog

logger = structlog.get_logger()

DATA_DIR = Path(__file__).parent.parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

APP_STATE_FILE = DATA_DIR / "app_state.json"

DEFAULT_STATE = {
    "last_voice_profile_id": None,
    "last_tts_voice": None,
    "window_position": {"x": None, "y": None},
    "window_size": {"width": None, "height": None},
    "active_command_ids": [],
    "recent_commands": [],
    "started_at": None,
    "last_session_at": None,
}


class AppState:
    def __init__(
        self,
        last_voice_profile_id: Optional[str] = None,
        last_tts_voice: Optional[str] = None,
        window_position: Optional[dict] = None,
        window_size: Optional[dict] = None,
        active_command_ids: list = None,
        recent_commands: list = None,
        started_at: Optional[str] = None,
        last_session_at: Optional[str] = None,
    ):
        self.last_voice_profile_id = last_voice_profile_id
        self.last_tts_voice = last_tts_voice
        self.window_position = window_position or {"x": None, "y": None}
        self.window_size = window_size or {"width": None, "height": None}
        self.active_command_ids = active_command_ids or []
        self.recent_commands = recent_commands or []
        self.started_at = started_at
        self.last_session_at = last_session_at

    def to_dict(self) -> dict:
        return {
            "last_voice_profile_id": self.last_voice_profile_id,
            "last_tts_voice": self.last_tts_voice,
            "window_position": self.window_position,
            "window_size": self.window_size,
            "active_command_ids": self.active_command_ids,
            "recent_commands": self.recent_commands,
            "started_at": self.started_at,
            "last_session_at": self.last_session_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AppState":
        return cls(
            last_voice_profile_id=data.get("last_voice_profile_id"),
            last_tts_voice=data.get("last_tts_voice"),
            window_position=data.get("window_position", {"x": None, "y": None}),
            window_size=data.get("window_size", {"width": None, "height": None}),
            active_command_ids=data.get("active_command_ids", []),
            recent_commands=data.get("recent_commands", []),
            started_at=data.get("started_at"),
            last_session_at=data.get("last_session_at"),
        )


class AppStateStore:
    def __init__(self, state_file: Path = APP_STATE_FILE):
        self.state_file = state_file
        self._state: AppState = AppState()
        self._load()

    def _load(self) -> None:
        if self.state_file.exists():
            try:
                data = json.loads(self.state_file.read_text())
                self._state = AppState.from_dict(data)
                self._state.last_session_at = datetime.utcnow().isoformat()
                logger.info("app_state_loaded")
            except Exception as e:
                logger.error("failed_to_load_app_state", error=str(e))
                self._state = AppState()
        else:
            self._state = AppState()
            self._state.started_at = datetime.utcnow().isoformat()

        if not self._state.started_at:
            self._state.started_at = datetime.utcnow().isoformat()
        self._save()

    def _save(self) -> None:
        try:
            data = self._state.to_dict()
            self.state_file.write_text(json.dumps(data, indent=2))
            logger.info("app_state_saved")
        except Exception as e:
            logger.error("failed_to_save_app_state", error=str(e))
            raise

    def get(self) -> AppState:
        return self._state

    def update(self, data: dict) -> AppState:
        current_dict = self._state.to_dict()
        current_dict.update(data)
        self._state = AppState.from_dict(current_dict)
        self._save()
        logger.info("app_state_updated", updated_keys=list(data.keys()))
        return self._state

    def add_recent_command(self, command_id: str, trigger: str) -> None:
        recent = self._state.recent_commands
        recent = [
            {
                "id": command_id,
                "trigger": trigger,
                "used_at": datetime.utcnow().isoformat(),
            }
        ] + recent
        self._state.recent_commands = recent[:10]
        self._save()


_app_state_store: Optional[AppStateStore] = None


def get_app_state_store() -> AppStateStore:
    global _app_state_store
    if _app_state_store is None:
        _app_state_store = AppStateStore()
    return _app_state_store
