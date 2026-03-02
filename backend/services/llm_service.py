"""NVIDIA API LLM Service for VoiceCode.

Connects to NVIDIA NIM endpoint for AI responses with streaming support.
"""

import os
import asyncio
from typing import AsyncGenerator, Optional
import httpx
import structlog

logger = structlog.get_logger()

# Configuration from environment
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")

# Fallback message when API is unavailable
FALLBACK_MESSAGE = "I'm sorry, I'm having trouble connecting to my AI brain right now. Please try again in a moment."


class LLMService:
    """NVIDIA API LLM service with streaming support."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or NVIDIA_API_KEY
        self.base_url = base_url or NVIDIA_BASE_URL
        self.model = model or NVIDIA_MODEL
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0, connect=10.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "You are a helpful voice assistant.",
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion from NVIDIA API.

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: System prompt for the assistant

        Yields:
            Text chunks from the streaming response
        """
        if not self.api_key:
            logger.warning("nvidia_api_key_missing", using_fallback=True)
            yield FALLBACK_MESSAGE
            return

        # Build the full message list with system prompt
        full_messages = [{"role": "system", "content": system_prompt}]
        full_messages.extend(messages[-10:])  # Last 10 messages for context

        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        
        payload = {
            "model": self.model,
            "messages": full_messages,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 500,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            client = await self._get_client()
            async with client.stream("POST", endpoint, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    logger.error(
                        "nvidia_api_error",
                        status=response.status_code,
                        response=await response.aread()
                    )
                    yield FALLBACK_MESSAGE
                    return

                # Parse Server-Sent Events stream
                buffer = ""
                async for chunk in response.aiter_bytes():
                    if chunk:
                        try:
                            buffer += chunk.decode("utf-8")
                        except UnicodeDecodeError:
                            continue

                        # Process complete SSE messages
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()
                            
                            if not line or not line.startswith("data:"):
                                continue
                            
                            data = line[5:].strip()  # Remove "data:" prefix
                            
                            if data == "[DONE]":
                                return
                            
                            # Parse the JSON chunk
                            try:
                                import json
                                chunk_data = json.loads(data)
                                delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except (json.JSONDecodeError, IndexError, KeyError):
                                continue

        except httpx.TimeoutException:
            logger.error("nvidia_api_timeout")
            yield FALLBACK_MESSAGE
        except httpx.ConnectError as e:
            logger.error("nvidia_api_connection_error", error=str(e))
            yield FALLBACK_MESSAGE
        except Exception as e:
            logger.error("nvidia_api_unexpected_error", error=str(e))
            yield FALLBACK_MESSAGE

    async def complete(
        self,
        messages: list[dict],
        system_prompt: str = "You are a helpful voice assistant.",
    ) -> str:
        """
        Get a complete (non-streaming) response from NVIDIA API.

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: System prompt for the assistant

        Returns:
            Complete response text
        """
        if not self.api_key:
            return FALLBACK_MESSAGE

        full_messages = [{"role": "system", "content": system_prompt}]
        full_messages.extend(messages[-10:])

        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"

        payload = {
            "model": self.model,
            "messages": full_messages,
            "stream": False,
            "temperature": 0.7,
            "max_tokens": 500,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            client = await self._get_client()
            response = await client.post(endpoint, json=payload, headers=headers)

            if response.status_code != 200:
                logger.error("nvidia_api_error", status=response.status_code)
                return FALLBACK_MESSAGE

            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", FALLBACK_MESSAGE)

        except Exception as e:
            logger.error("nvidia_api_error", error=str(e))
            return FALLBACK_MESSAGE


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get the LLM service singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
