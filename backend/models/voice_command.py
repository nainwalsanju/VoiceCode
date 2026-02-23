import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Any

import structlog

logger = structlog.get_logger()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "commands"
DATA_DIR.mkdir(parents=True, exist_ok=True)

VOICE_COMMANDS_FILE = DATA_DIR / "voice_commands.json"

ActionType = str


class VoiceCommand:
    def __init__(
        self,
        id: str,
        trigger: str,
        action_type: ActionType,
        action_data: dict,
        description: str = "",
        is_active: bool = True,
        is_regex: bool = False,
        priority: int = 0,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
    ):
        self.id = id
        self.trigger = trigger
        self.action_type = action_type
        self.action_data = action_data
        self.description = description
        self.is_active = is_active
        self.is_regex = is_regex
        self.priority = priority
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at or datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "trigger": self.trigger,
            "action_type": self.action_type,
            "action_data": self.action_data,
            "description": self.description,
            "is_active": self.is_active,
            "is_regex": self.is_regex,
            "priority": self.priority,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "VoiceCommand":
        return cls(
            id=data["id"],
            trigger=data["trigger"],
            action_type=data["action_type"],
            action_data=data.get("action_data", {}),
            description=data.get("description", ""),
            is_active=data.get("is_active", True),
            is_regex=data.get("is_regex", False),
            priority=data.get("priority", 0),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


class VoiceCommandStore:
    def __init__(self, commands_file: Path = VOICE_COMMANDS_FILE):
        self.commands_file = commands_file
        self._commands: list[VoiceCommand] = []
        self._load()

    def _load(self) -> None:
        if self.commands_file.exists():
            try:
                data = json.loads(self.commands_file.read_text())
                self._commands = [VoiceCommand.from_dict(c) for c in data]
                logger.info("voice_commands_loaded", count=len(self._commands))
            except Exception as e:
                logger.error("failed_to_load_voice_commands", error=str(e))
                self._commands = []
        else:
            self._commands = []

    def _save(self) -> None:
        try:
            data = [c.to_dict() for c in self._commands]
            self.commands_file.write_text(json.dumps(data, indent=2))
            logger.info("voice_commands_saved", count=len(self._commands))
        except Exception as e:
            logger.error("failed_to_save_voice_commands", error=str(e))
            raise

    def create(
        self,
        trigger: str,
        action_type: ActionType,
        action_data: dict,
        description: str = "",
        is_active: bool = True,
        is_regex: bool = False,
        priority: int = 0,
    ) -> VoiceCommand:
        command = VoiceCommand(
            id=str(uuid.uuid4()),
            trigger=trigger,
            action_type=action_type,
            action_data=action_data,
            description=description,
            is_active=is_active,
            is_regex=is_regex,
            priority=priority,
        )

        self._commands.append(command)
        self._save()
        logger.info("voice_command_created", id=command.id, trigger=command.trigger)
        return command

    def get_by_id(self, command_id: str) -> Optional[VoiceCommand]:
        for command in self._commands:
            if command.id == command_id:
                return command
        return None

    def get_by_trigger(self, trigger: str) -> Optional[VoiceCommand]:
        for command in self._commands:
            if command.trigger == trigger and command.is_active:
                return command
        return None

    def find_matching(self, text: str) -> Optional[VoiceCommand]:
        matches = []
        for command in self._commands:
            if not command.is_active:
                continue

            if command.is_regex:
                import re

                try:
                    if re.search(command.trigger, text, re.IGNORECASE):
                        matches.append(command)
                except re.error:
                    pass
            else:
                if command.trigger.lower() in text.lower():
                    matches.append(command)

        if not matches:
            return None

        return sorted(matches, key=lambda c: c.priority, reverse=True)[0]

    def list_all(self) -> list[VoiceCommand]:
        return sorted(self._commands, key=lambda c: c.priority, reverse=True)

    def list_active(self) -> list[VoiceCommand]:
        return sorted(
            [c for c in self._commands if c.is_active],
            key=lambda c: c.priority,
            reverse=True,
        )

    def update(
        self,
        command_id: str,
        trigger: Optional[str] = None,
        action_type: Optional[ActionType] = None,
        action_data: Optional[dict] = None,
        description: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_regex: Optional[bool] = None,
        priority: Optional[int] = None,
    ) -> Optional[VoiceCommand]:
        command = self.get_by_id(command_id)
        if not command:
            return None

        if trigger is not None:
            command.trigger = trigger
        if action_type is not None:
            command.action_type = action_type
        if action_data is not None:
            command.action_data = action_data
        if description is not None:
            command.description = description
        if is_active is not None:
            command.is_active = is_active
        if is_regex is not None:
            command.is_regex = is_regex
        if priority is not None:
            command.priority = priority

        command.updated_at = datetime.utcnow().isoformat()
        self._save()
        logger.info("voice_command_updated", id=command_id)
        return command

    def delete(self, command_id: str) -> bool:
        command = self.get_by_id(command_id)
        if not command:
            return False

        self._commands = [c for c in self._commands if c.id != command_id]
        self._save()
        logger.info("voice_command_deleted", id=command_id)
        return True


_voice_command_store: Optional[VoiceCommandStore] = None


def get_voice_command_store() -> VoiceCommandStore:
    global _voice_command_store
    if _voice_command_store is None:
        _voice_command_store = VoiceCommandStore()
    return _voice_command_store
