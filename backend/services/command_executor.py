import json
import re
import subprocess
import shlex
from typing import Optional, Any
from dataclasses import dataclass

import structlog

logger = structlog.get_logger()


@dataclass
class ExecutionResult:
    success: bool
    action_type: str
    output: Any
    error: Optional[str] = None


class CommandExecutor:
    def __init__(self):
        self.handlers = {
            "insert_text": self._handle_insert_text,
            "run_command": self._handle_run_command,
            "hotkey": self._handle_hotkey,
            "snippet": self._handle_snippet,
        }

    def execute(self, action_type: str, action_data: dict) -> ExecutionResult:
        handler = self.handlers.get(action_type)
        if not handler:
            return ExecutionResult(
                success=False,
                action_type=action_type,
                output=None,
                error=f"Unknown action type: {action_type}",
            )

        try:
            return handler(action_data)
        except Exception as e:
            logger.error(
                "command_execution_failed", action_type=action_type, error=str(e)
            )
            return ExecutionResult(
                success=False,
                action_type=action_type,
                output=None,
                error=str(e),
            )

    def _handle_insert_text(self, data: dict) -> ExecutionResult:
        text = data.get("text", "")
        return ExecutionResult(
            success=True,
            action_type="insert_text",
            output={"text": text, "type": "insert"},
        )

    def _handle_run_command(self, data: dict) -> ExecutionResult:
        command = data.get("command", "")
        shell = data.get("shell", True)
        timeout = data.get("timeout", 30)

        if not command:
            return ExecutionResult(
                success=False,
                action_type="run_command",
                output=None,
                error="No command specified",
            )

        try:
            result = subprocess.run(
                command if not shell else shlex.split(command),
                shell=shell,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            return ExecutionResult(
                success=result.returncode == 0,
                action_type="run_command",
                output={
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode,
                },
                error=None if result.returncode == 0 else result.stderr,
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(
                success=False,
                action_type="run_command",
                output=None,
                error=f"Command timed out after {timeout} seconds",
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                action_type="run_command",
                output=None,
                error=str(e),
            )

    def _handle_hotkey(self, data: dict) -> ExecutionResult:
        keys = data.get("keys", [])
        modifiers = data.get("modifiers", [])

        if not keys:
            return ExecutionResult(
                success=False,
                action_type="hotkey",
                output=None,
                error="No keys specified",
            )

        return ExecutionResult(
            success=True,
            action_type="hotkey",
            output={
                "keys": keys,
                "modifiers": modifiers,
                "type": "hotkey",
            },
        )

    def _handle_snippet(self, data: dict) -> ExecutionResult:
        template = data.get("template", "")
        variables = data.get("variables", {})

        if not template:
            return ExecutionResult(
                success=False,
                action_type="snippet",
                output=None,
                error="No template specified",
            )

        try:
            expanded = self._expand_template(template, variables)
            return ExecutionResult(
                success=True,
                action_type="snippet",
                output={"text": expanded, "type": "insert"},
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                action_type="snippet",
                output=None,
                error=f"Template expansion failed: {str(e)}",
            )

    def _expand_template(self, template: str, variables: dict) -> str:
        result = template
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        return result

    def find_and_execute(self, text: str, commands: list) -> Optional[ExecutionResult]:
        for cmd in commands:
            if not cmd.get("is_active", True):
                continue

            trigger = cmd.get("trigger", "")
            is_regex = cmd.get("is_regex", False)

            if is_regex:
                try:
                    if re.search(trigger, text, re.IGNORECASE):
                        return self.execute(
                            cmd.get("action_type", ""),
                            cmd.get("action_data", {}),
                        )
                except re.error:
                    pass
            else:
                if trigger.lower() in text.lower():
                    return self.execute(
                        cmd.get("action_type", ""),
                        cmd.get("action_data", {}),
                    )

        return None


_command_executor: Optional[CommandExecutor] = None


def get_command_executor() -> CommandExecutor:
    global _command_executor
    if _command_executor is None:
        _command_executor = CommandExecutor()
    return _command_executor
