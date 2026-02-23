import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog

logger = structlog.get_logger()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "voice_profiles"
DATA_DIR.mkdir(parents=True, exist_ok=True)

VOICE_PROFILES_FILE = DATA_DIR / "voice_profiles.json"


class VoiceProfile:
    def __init__(
        self,
        id: str,
        name: str,
        voice_id: str,
        is_default: bool = False,
        created_at: Optional[str] = None,
        audio_sample_path: Optional[str] = None,
    ):
        self.id = id
        self.name = name
        self.voice_id = voice_id
        self.is_default = is_default
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.audio_sample_path = audio_sample_path

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "voice_id": self.voice_id,
            "is_default": self.is_default,
            "created_at": self.created_at,
            "audio_sample_path": self.audio_sample_path,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "VoiceProfile":
        return cls(
            id=data["id"],
            name=data["name"],
            voice_id=data["voice_id"],
            is_default=data.get("is_default", False),
            created_at=data.get("created_at"),
            audio_sample_path=data.get("audio_sample_path"),
        )


class VoiceProfileStore:
    def __init__(self, profiles_file: Path = VOICE_PROFILES_FILE):
        self.profiles_file = profiles_file
        self._profiles: list[VoiceProfile] = []
        self._load()

    def _load(self) -> None:
        if self.profiles_file.exists():
            try:
                data = json.loads(self.profiles_file.read_text())
                self._profiles = [VoiceProfile.from_dict(p) for p in data]
                logger.info("voice_profiles_loaded", count=len(self._profiles))
            except Exception as e:
                logger.error("failed_to_load_voice_profiles", error=str(e))
                self._profiles = []
        else:
            self._profiles = []

    def _save(self) -> None:
        try:
            data = [p.to_dict() for p in self._profiles]
            self.profiles_file.write_text(json.dumps(data, indent=2))
            logger.info("voice_profiles_saved", count=len(self._profiles))
        except Exception as e:
            logger.error("failed_to_save_voice_profiles", error=str(e))
            raise

    def create(
        self,
        name: str,
        voice_id: str,
        is_default: bool = False,
        audio_sample_path: Optional[str] = None,
    ) -> VoiceProfile:
        profile = VoiceProfile(
            id=str(uuid.uuid4()),
            name=name,
            voice_id=voice_id,
            is_default=is_default,
            audio_sample_path=audio_sample_path,
        )

        if is_default:
            for p in self._profiles:
                p.is_default = False

        self._profiles.append(profile)
        self._save()
        logger.info("voice_profile_created", id=profile.id, name=profile.name)
        return profile

    def get_by_id(self, profile_id: str) -> Optional[VoiceProfile]:
        for profile in self._profiles:
            if profile.id == profile_id:
                return profile
        return None

    def get_by_voice_id(self, voice_id: str) -> Optional[VoiceProfile]:
        for profile in self._profiles:
            if profile.voice_id == voice_id:
                return profile
        return None

    def list_all(self) -> list[VoiceProfile]:
        return sorted(self._profiles, key=lambda p: p.created_at, reverse=True)

    def get_default(self) -> Optional[VoiceProfile]:
        for profile in self._profiles:
            if profile.is_default:
                return profile
        return self._profiles[0] if self._profiles else None

    def update(
        self,
        profile_id: str,
        name: Optional[str] = None,
        voice_id: Optional[str] = None,
        is_default: Optional[bool] = None,
        audio_sample_path: Optional[str] = None,
    ) -> Optional[VoiceProfile]:
        profile = self.get_by_id(profile_id)
        if not profile:
            return None

        if is_default is not None and is_default:
            for p in self._profiles:
                p.is_default = False

        if name is not None:
            profile.name = name
        if voice_id is not None:
            profile.voice_id = voice_id
        if is_default is not None:
            profile.is_default = is_default
        if audio_sample_path is not None:
            profile.audio_sample_path = audio_sample_path

        self._save()
        logger.info("voice_profile_updated", id=profile_id)
        return profile

    def delete(self, profile_id: str) -> bool:
        profile = self.get_by_id(profile_id)
        if not profile:
            return False

        self._profiles = [p for p in self._profiles if p.id != profile_id]
        self._save()
        logger.info("voice_profile_deleted", id=profile_id)
        return True


_voice_profile_store: Optional[VoiceProfileStore] = None


def get_voice_profile_store() -> VoiceProfileStore:
    global _voice_profile_store
    if _voice_profile_store is None:
        _voice_profile_store = VoiceProfileStore()
    return _voice_profile_store
