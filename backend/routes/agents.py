import structlog
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from backend.models.agent import AgentProfile, AgentProfileCreate, AgentProfileUpdate, ChatSession, ChatMessage
from backend.services.agent_service import get_agent_service, AgentService

logger = structlog.get_logger()
router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=List[AgentProfile])
async def list_agents(service: AgentService = Depends(get_agent_service)):
    return service.get_agents()


@router.post("/", response_model=AgentProfile)
async def create_agent(
    agent_data: AgentProfileCreate,
    service: AgentService = Depends(get_agent_service)
):
    return service.create_agent(agent_data)


@router.get("/{agent_id}", response_model=AgentProfile)
async def get_agent(agent_id: str, service: AgentService = Depends(get_agent_service)):
    agent = service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=AgentProfile)
async def update_agent(
    agent_id: str,
    update_data: AgentProfileUpdate,
    service: AgentService = Depends(get_agent_service)
):
    agent = service.update_agent(agent_id, update_data)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, service: AgentService = Depends(get_agent_service)):
    success = service.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "success"}


# Chat Session Endpoints

@router.get("/sessions/", response_model=List[ChatSession])
async def list_sessions(service: AgentService = Depends(get_agent_service)):
    return service.get_sessions()


@router.post("/sessions/", response_model=ChatSession)
async def create_session(
    title: str = "New Conversation",
    active_agent_ids: List[str] = [],
    service: AgentService = Depends(get_agent_service)
):
    return service.create_session(title=title, active_agent_ids=active_agent_ids)


@router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_session(session_id: str, service: AgentService = Depends(get_agent_service)):
    session = service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions/{session_id}/messages", response_model=ChatSession)
async def add_message(
    session_id: str,
    message: ChatMessage,
    service: AgentService = Depends(get_agent_service)
):
    session = service.add_message(session_id, message)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
