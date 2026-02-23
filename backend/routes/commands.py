import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.models.voice_command import get_voice_command_store, ActionType
from backend.services.command_executor import get_command_executor

router = APIRouter(prefix="/commands", tags=["commands"])

TEMPLATES_FILE = (
    Path(__file__).parent.parent.parent / "data" / "commands" / "templates.json"
)


class CommandCreate(BaseModel):
    trigger: str
    action_type: ActionType
    action_data: dict
    description: str = ""
    is_active: bool = True
    is_regex: bool = False
    priority: int = 0


class CommandUpdate(BaseModel):
    trigger: Optional[str] = None
    action_type: Optional[ActionType] = None
    action_data: Optional[dict] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_regex: Optional[bool] = None
    priority: Optional[int] = None


class CommandResponse(BaseModel):
    id: str
    trigger: str
    action_type: str
    action_data: dict
    description: str
    is_active: bool
    is_regex: bool
    priority: int
    created_at: str
    updated_at: str


# IMPORTANT: /templates must come BEFORE /{command_id} to avoid route conflict
@router.get("/templates")
async def get_templates():
    """Get available command templates."""
    if not TEMPLATES_FILE.exists():
        return []

    try:
        templates = json.loads(TEMPLATES_FILE.read_text())
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to load templates: {str(e)}"
        )


class ExecuteRequest(BaseModel):
    text: str


class ExecuteResponse(BaseModel):
    matched: bool
    command_id: Optional[str] = None
    trigger: Optional[str] = None
    action_type: Optional[str] = None
    success: bool
    output: Optional[dict] = None
    error: Optional[str] = None


@router.post("/execute")
async def execute_command(request: ExecuteRequest):
    """Execute a command based on transcribed text."""
    store = get_voice_command_store()
    executor = get_command_executor()

    command = store.find_matching(request.text)
    if not command:
        return ExecuteResponse(
            matched=False,
            success=False,
            error="No matching command found",
        )

    result = executor.execute(command.action_type, command.action_data)

    return ExecuteResponse(
        matched=True,
        command_id=command.id,
        trigger=command.trigger,
        action_type=command.action_type,
        success=result.success,
        output=result.output,
        error=result.error,
    )


@router.get("")
async def list_commands():
    """List all voice commands."""
    store = get_voice_command_store()
    commands = store.list_all()
    return [c.to_dict() for c in commands]


@router.get("/active")
async def list_active_commands():
    """List all active voice commands."""
    store = get_voice_command_store()
    commands = store.list_active()
    return [c.to_dict() for c in commands]


# IMPORTANT: /{command_id} must come AFTER more specific routes
@router.get("/{command_id}")
async def get_command(command_id: str):
    """Get a specific command by ID."""
    store = get_voice_command_store()
    command = store.get_by_id(command_id)
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    return command.to_dict()


@router.post("")
async def create_command(command: CommandCreate):
    """Create a new voice command."""
    store = get_voice_command_store()
    new_command = store.create(
        trigger=command.trigger,
        action_type=command.action_type,
        action_data=command.action_data,
        description=command.description,
        is_active=command.is_active,
        is_regex=command.is_regex,
        priority=command.priority,
    )
    return new_command.to_dict()


@router.post("/{command_id}")
async def update_command(command_id: str, command: CommandUpdate):
    """Update an existing voice command."""
    store = get_voice_command_store()
    updated = store.update(
        command_id=command_id,
        trigger=command.trigger,
        action_type=command.action_type,
        action_data=command.action_data,
        description=command.description,
        is_active=command.is_active,
        is_regex=command.is_regex,
        priority=command.priority,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Command not found")
    return updated.to_dict()


@router.delete("/{command_id}")
async def delete_command(command_id: str):
    """Delete a voice command."""
    store = get_voice_command_store()
    deleted = store.delete(command_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Command not found")
    return {"status": "deleted", "id": command_id}


@router.post("/{command_id}/toggle")
async def toggle_command(command_id: str):
    """Toggle a command's active status."""
    store = get_voice_command_store()
    command = store.get_by_id(command_id)
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")

    updated = store.update(command_id, is_active=not command.is_active)
    return updated.to_dict()
