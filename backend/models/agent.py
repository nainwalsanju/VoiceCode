from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class AgentProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    system_prompt: str
    voice_profile_id: Optional[str] = None
    color: str = "#3B82F6"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AgentProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None
    system_prompt: str
    voice_profile_id: Optional[str] = None
    color: Optional[str] = "#3B82F6"

class AgentProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    voice_profile_id: Optional[str] = None
    color: Optional[str] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str # "user", "assistant", "system"
    content: str
    agent_id: Optional[str] = None # Which agent spoke it, if it was an assistant
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Conversation"
    messages: List[ChatMessage] = []
    active_agent_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
