import json
import structlog
from typing import AsyncGenerator, Tuple, List, Optional
import asyncio

from backend.models.agent import ChatSession, AgentProfile, ChatMessage
from backend.services.agent_service import get_agent_service, AgentService
from backend.services.llm_service import get_llm_service, LLMService

logger = structlog.get_logger()

class OrchestratorService:
    def __init__(self):
        self.agent_service = get_agent_service()
        self.llm_service = get_llm_service()

    async def determine_speaker(self, session: ChatSession, text: str) -> AgentProfile:
        """Determines which agent should respond based on the conversation history and current text."""
        active_agents = [self.agent_service.get_agent(aid) for aid in session.active_agent_ids]
        active_agents = [a for a in active_agents if a is not None]

        if not active_agents:
            # Fallback to a default agent if none are active
            default_agent = self.agent_service.get_agents()[0]
            return default_agent

        if len(active_agents) == 1:
            return active_agents[0]

        # Multi-agent routing logic
        # We ask the LLM to decide who is best suited to respond
        agent_descriptions = "\n".join([f"- ID: {a.id}, Name: {a.name}, Role: {a.description}" for a in active_agents])
        
        system_prompt = f"""You are a multi-agent orchestrator. 
The user said: "{text}"

Available agents:
{agent_descriptions}

Which agent should respond? Return ONLY a valid JSON object strictly in this format: {{"agent_id": "the-id-here"}}"""

        messages = [{"role": "system", "content": system_prompt}]
        
        # We can append recent context to help the orchestrator decide
        recent_messages = session.messages[-5:]
        for msg in recent_messages:
            role = "user" if msg.role == "user" else "assistant"
            messages.append({"role": role, "content": msg.content})
            
        try:
            response = await self.llm_service.complete(messages=messages, system_prompt=system_prompt)
            # Try to safely extract the json
            start_idx = response.find("{")
            end_idx = response.rfind("}") + 1
            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx]
                data = json.loads(json_str)
                selected_id = data.get("agent_id")
                
                for agent in active_agents:
                    if agent.id == selected_id:
                        logger.info("orchestrator_selected_agent", agent_name=agent.name)
                        return agent
        except Exception as e:
            logger.error("orchestrator_routing_failed", error=str(e))
            
        # Fallback to the first active agent if parsing fails
        return active_agents[0]

    async def stream_agent_response(
        self, 
        session: ChatSession, 
        text: str
    ) -> AsyncGenerator[Tuple[AgentProfile, str], None]:
        """
        Determines the speaker, then streams their response.
        Yields tuples of (Speaking Agent, Sentence Chunk).
        """
        # Save the user's message
        user_msg = ChatMessage(role="user", content=text)
        self.agent_service.add_message(session.id, user_msg)
        
        # 1. Determine who speaks
        speaking_agent = await self.determine_speaker(session, text)
        
        # 2. Build context for the speaking agent
        messages = []
        for msg in session.messages:
            if msg.role == "user":
                messages.append({"role": "user", "content": msg.content})
            else:
                prefix = ""
                if len(session.active_agent_ids) > 1 and msg.agent_id:
                    a = self.agent_service.get_agent(msg.agent_id)
                    if a:
                        prefix = f"[{a.name}]: "
                messages.append({"role": "assistant", "content": f"{prefix}{msg.content}"})
                
        # Ensure we don't blow up the context window
        messages = messages[-10:]
        
        # 3. Stream from LLM
        system_prompt = speaking_agent.system_prompt
        
        full_response = ""
        async for chunk in self.llm_service.stream_completion(messages=messages, system_prompt=system_prompt):
            full_response += chunk
            yield speaking_agent, chunk
            
        # 4. Save the assistant's message
        if full_response.strip():
            assistant_msg = ChatMessage(
                role="assistant", 
                content=full_response.strip(),
                agent_id=speaking_agent.id
            )
            self.agent_service.add_message(session.id, assistant_msg)

_orchestrator_service = None

def get_orchestrator_service() -> OrchestratorService:
    global _orchestrator_service
    if _orchestrator_service is None:
        _orchestrator_service = OrchestratorService()
    return _orchestrator_service
