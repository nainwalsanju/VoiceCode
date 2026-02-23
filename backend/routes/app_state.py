from fastapi import APIRouter

from backend.models.app_state import get_app_state_store

router = APIRouter(prefix="/app-state", tags=["app-state"])


@router.get("")
async def get_app_state() -> dict:
    store = get_app_state_store()
    return store.get().to_dict()


@router.put("")
async def update_app_state(state: dict) -> dict:
    store = get_app_state_store()
    updated = store.update(state)
    return updated.to_dict()


@router.post("/recent-command")
async def add_recent_command(command: dict) -> dict:
    store = get_app_state_store()
    store.add_recent_command(command.get("id", ""), command.get("trigger", ""))
    return store.get().to_dict()
