import json
import os
import structlog
from typing import List, Optional
from datetime import datetime

from backend.models.agent import AgentProfile, AgentProfileCreate, AgentProfileUpdate, ChatSession, ChatMessage

logger = structlog.get_logger()

AGENTS_FILE = os.path.join("data", "agents.json")
# Store sessions in memory or simple JSON for prototype? Let's use a json file too.
SESSIONS_FILE = os.path.join("data", "chat_sessions.json")

class AgentService:
    def __init__(self):
        self._ensure_data_dir()
        self.agents = self._load_agents()
        self.sessions = self._load_sessions()
        
        # Add default System Agent if not exists
        if not self.agents:
            self.create_agent(AgentProfileCreate(
                name="Jarvis",
                description="Default VoiceCode Assistant",
                system_prompt="You are Jarvis, a helpful, brilliant, and deeply knowledgeable voice AI assistant for VoiceCode. You write code, explain concepts, and help the user.",
                color="#3B82F6"
            ))

    def _ensure_data_dir(self):
        os.makedirs("data", exist_ok=True)
        if not os.path.exists(AGENTS_FILE):
            with open(AGENTS_FILE, "w") as f:
                json.dump([], f)
        if not os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, "w") as f:
                json.dump([], f)

    def _load_agents(self) -> List[AgentProfile]:
        try:
            with open(AGENTS_FILE, "r") as f:
                data = json.load(f)
                return [AgentProfile(**item) for item in data]
        except Exception as e:
            logger.error("error_loading_agents", error=str(e))
            return []

    def _save_agents(self):
        try:
            with open(AGENTS_FILE, "w") as f:
                json.dump([agent.dict() for agent in self.agents], f, default=str, indent=2)
        except Exception as e:
            logger.error("error_saving_agents", error=str(e))

    def _load_sessions(self) -> List[ChatSession]:
        try:
            with open(SESSIONS_FILE, "r") as f:
                data = json.load(f)
                return [ChatSession(**item) for item in data]
        except Exception as e:
            logger.error("error_loading_sessions", error=str(e))
            return []

    def _save_sessions(self):
        try:
            with open(SESSIONS_FILE, "w") as f:
                json.dump([session.dict() for session in self.sessions], f, default=str, indent=2)
        except Exception as e:
            logger.error("error_saving_sessions", error=str(e))

    # --- Agent CRUD ---

    def get_agents(self) -> List[AgentProfile]:
        return self.agents

    def get_agent(self, agent_id: str) -> Optional[AgentProfile]:
        for agent in self.agents:
            if agent.id == agent_id:
                return agent
        return None

    def create_agent(self, agent_data: AgentProfileCreate) -> AgentProfile:
        agent = AgentProfile(**agent_data.dict())
        self.agents.append(agent)
        self._save_agents()
        logger.info("agent_created", agent_id=agent.id, name=agent.name)
        return agent

    def update_agent(self, agent_id: str, update_data: AgentProfileUpdate) -> Optional[AgentProfile]:
        agent = self.get_agent(agent_id)
        if not agent:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(agent, field, value)
            
        agent.updated_at = datetime.utcnow()
        self._save_agents()
        logger.info("agent_updated", agent_id=agent.id)
        return agent
        
    def delete_agent(self, agent_id: str) -> bool:
        initial_count = len(self.agents)
        self.agents = [a for a in self.agents if a.id != agent_id]
        if len(self.agents) < initial_count:
            self._save_agents()
            logger.info("agent_deleted", agent_id=agent_id)
            return True
        return False

    # --- Session CRUD ---

    def get_sessions(self) -> List[ChatSession]:
        return sorted(self.sessions, key=lambda s: s.updated_at, reverse=True)

    def get_session(self, session_id: str) -> Optional[ChatSession]:
        for session in self.sessions:
            if session.id == session_id:
                return session
        return None

    def create_session(self, title: str = "New Conversation", active_agent_ids: List[str] = None) -> ChatSession:
        if active_agent_ids is None:
            active_agent_ids = [self.agents[0].id] if self.agents else []
            
        session = ChatSession(title=title, active_agent_ids=active_agent_ids)
        self.sessions.append(session)
        self._save_sessions()
        logger.info("chat_session_created", session_id=session.id)
        return session

    def add_message(self, session_id: str, message: ChatMessage) -> Optional[ChatSession]:
        session = self.get_session(session_id)
        if not session:
            return None
            
        session.messages.append(message)
        session.updated_at = datetime.utcnow()
        self._save_sessions()
        return session

_agent_service = None

def get_agent_service() -> AgentService:
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
