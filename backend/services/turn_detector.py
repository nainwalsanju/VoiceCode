"""
Turn Detection Service for conversation turn endpointing.

Detects when user has finished speaking and is yielding the floor.
Requirements: CONV-01
"""

import structlog
import asyncio
import time
from typing import Optional, Callable, List, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

logger = structlog.get_logger()


class TurnState(Enum):
    """Conversation turn states."""
    IDLE = "idle"
    USER_SPEAKING = "user_speaking"
    PROCESSING = "processing"
    AGENT_SPEAKING = "agent_speaking"
    AWAITING_USER = "awaiting_user"


@dataclass
class TurnResult:
    """Result from turn detection."""
    is_turn_end: bool
    turn_state: TurnState
    transcript: str = ""
    confidence: float = 0.0
    end_reason: str = ""


@dataclass
class TurnConfig:
    """Configuration for turn detection."""
    # Silence duration to detect turn end (ms)
    silence_threshold_ms: int = 500
    # Minimum speech duration to consider valid (ms)
    min_speech_duration_ms: int = 300
    # Maximum turn duration before forcing end (ms)
    max_turn_duration_ms: int = 30000
    # Minimum words before considering turn complete
    min_words: int = 1
    # Enable adaptive threshold based on speaking rate
    adaptive_threshold: bool = True


class TurnDetector:
    """
    Turn endpointing logic for detecting when user finishes speaking.
    
    Uses multiple signals:
    - VAD silence detection
    - Transcript completeness
    - Timing heuristics
    """
    
    def __init__(self, config: Optional[TurnConfig] = None):
        self.config = config or TurnConfig()
        
        self._current_state = TurnState.IDLE
        self._turn_start_time: Optional[float] = None
        self._last_speech_time: Optional[float] = None
        self._silence_duration_ms: float = 0
        self._transcript_buffer: List[str] = []
        self._word_count = 0
        
        # Callbacks
        self._on_turn_end: Optional[Callable] = None
        self._on_state_change: Optional[Callable] = None
        
        # Adaptive threshold state
        self._recent_silence_durations: List[float] = []
        self._adaptive_threshold: float = self.config.silence_threshold_ms
        
        logger.info(
            "turn_detector_init",
            silence_threshold_ms=self.config.silence_threshold_ms,
            min_speech_duration_ms=self.config.min_speech_duration_ms,
        )

    def start_turn(self, transcript: str = ""):
        """Mark the start of a user turn."""
        self._turn_start_time = time.time() * 1000
        self._last_speech_time = self._turn_start_time
        self._silence_duration_ms = 0
        self._transcript_buffer = [transcript] if transcript else []
        self._word_count = len(transcript.split()) if transcript else 0
        
        old_state = self._current_state
        self._current_state = TurnState.USER_SPEAKING
        
        logger.info(
            "turn_started",
            transcript_preview=transcript[:50] if transcript else "",
            word_count=self._word_count,
        )
        
        if old_state != self._current_state:
            self._notify_state_change()

    def update_transcript(self, transcript: str, is_final: bool = False):
        """Update the current transcript."""
        if transcript:
            self._transcript_buffer.append(transcript)
            self._word_count = len(" ".join(self._transcript_buffer).split())
            
        if is_final:
            self._last_speech_time = time.time() * 1000
            
        logger.debug(
            "transcript_updated",
            word_count=self._word_count,
            is_final=is_final,
        )

    def process_silence(self, silence_duration_ms: float) -> TurnResult:
        """
        Process silence duration and determine if turn has ended.
        
        Args:
            silence_duration_ms: Duration of continuous silence
            
        Returns:
            TurnResult indicating if turn has ended
        """
        self._silence_duration_ms = silence_duration_ms
        
        # Update adaptive threshold if enabled
        if self.config.adaptive_threshold:
            self._update_adaptive_threshold(silence_duration_ms)
        
        # Check various end-of-turn conditions
        turn_end_reason = ""
        is_turn_end = False
        
        # Condition 1: Silence exceeds threshold
        effective_threshold = self._adaptive_threshold
        if silence_duration_ms >= effective_threshold:
            if self._word_count >= self.config.min_words:
                is_turn_end = True
                turn_end_reason = f"silence_threshold_{int(effective_threshold)}ms"
            elif silence_duration_ms >= self.config.max_turn_duration_ms:
                # Force end on max duration
                is_turn_end = True
                turn_end_reason = "max_turn_duration"
        
        # Condition 2: Minimum speech duration not met but extended silence
        if self._turn_start_time is not None:
            elapsed = (time.time() * 1000) - self._turn_start_time
            if elapsed < self.config.min_speech_duration_ms:
                if silence_duration_ms >= self.config.silence_threshold_ms * 2:
                    is_turn_end = False  # Too short, ignore
                    turn_end_reason = "too_short"
        
        if is_turn_end:
            self._current_state = TurnState.PROCESSING
            self._notify_state_change()
            
            full_transcript = " ".join(self._transcript_buffer)
            
            logger.info(
                "turn_ended",
                transcript_preview=full_transcript[:100],
                word_count=self._word_count,
                silence_duration_ms=silence_duration_ms,
                reason=turn_end_reason,
            )
            
            if self._on_turn_end:
                asyncio.create_task(self._on_turn_end(full_transcript))
            
            return TurnResult(
                is_turn_end=True,
                turn_state=self._current_state,
                transcript=full_transcript,
                confidence=self._calculate_confidence(),
                end_reason=turn_end_reason,
            )
        
        return TurnResult(
            is_turn_end=False,
            turn_state=self._current_state,
            transcript=" ".join(self._transcript_buffer),
            confidence=self._calculate_confidence(),
        )

    def _update_adaptive_threshold(self, silence_duration: float):
        """Update adaptive threshold based on recent silence patterns."""
        # Track recent silence durations
        self._recent_silence_durations.append(silence_duration)
        
        # Keep only recent samples (last 5)
        if len(self._recent_silence_durations) > 5:
            self._recent_silence_durations.pop(0)
        
        # If we have enough samples, calculate adaptive threshold
        if len(self._recent_silence_durations) >= 3:
            avg_silence = sum(self._recent_silence_durations) / len(self._recent_silence_durations)
            
            # Adjust threshold slightly above average but cap it
            new_threshold = min(
                max(avg_silence * 1.2, 300),  # At least 300ms
                self.config.silence_threshold_ms * 1.5  # At most 1.5x default
            )
            
            if abs(new_threshold - self._adaptive_threshold) > 50:
                self._adaptive_threshold = new_threshold
                logger.debug("adaptive_threshold_updated", threshold=new_threshold)

    def _calculate_confidence(self) -> float:
        """Calculate confidence that this is a complete turn."""
        confidence = 0.0
        
        # Factor 1: Word count (0-0.4)
        if self._word_count >= 5:
            confidence += 0.4
        elif self._word_count > 0:
            confidence += 0.2 * (self._word_count / 5)
        
        # Factor 2: Silence duration (0-0.3)
        silence_factor = min(1.0, self._silence_duration_ms / self._adaptive_threshold)
        confidence += 0.3 * silence_factor
        
        # Factor 3: Ends with complete punctuation (0-0.3)
        full_transcript = " ".join(self._transcript_buffer)
        if full_transcript.endswith(('.', '!', '?')):
            confidence += 0.3
        elif full_transcript.strip():
            confidence += 0.1
            
        return min(1.0, confidence)

    def set_processing(self):
        """Mark that agent is processing."""
        old_state = self._current_state
        self._current_state = TurnState.PROCESSING
        
        if old_state != self._current_state:
            self._notify_state_change()

    def set_agent_speaking(self):
        """Mark that agent is speaking."""
        old_state = self._current_state
        self._current_state = TurnState.AGENT_SPEAKING
        
        if old_state != self._current_state:
            self._notify_state_change()

    def set_idle(self):
        """Reset to idle state."""
        old_state = self._current_state
        self._current_state = TurnState.IDLE
        
        if old_state != self._current_state:
            self._notify_state_change()
        
        # Clear buffers
        self._transcript_buffer = []
        self._word_count = 0

    def _notify_state_change(self):
        """Notify listeners of state change."""
        if self._on_state_change:
            try:
                self._on_state_change(self._current_state)
            except Exception as e:
                logger.error("state_change_callback_error", error=str(e))

    def get_state(self) -> TurnState:
        """Get current turn state."""
        return self._current_state

    def get_transcript(self) -> str:
        """Get current transcript."""
        return " ".join(self._transcript_buffer)

    def get_config(self) -> TurnConfig:
        """Get current configuration."""
        return self.config

    def update_config(self, **kwargs):
        """Update configuration."""
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
        
        logger.info("turn_detector_config_updated", **kwargs)

    def reset(self):
        """Reset detector state."""
        self.set_idle()
        self._silence_duration_ms = 0
        self._adaptive_threshold = self.config.silence_threshold_ms
        self._recent_silence_durations = []
        
        logger.debug("turn_detector_reset")


# Global singleton
_turn_detector: Optional[TurnDetector] = None


def get_turn_detector(**kwargs) -> TurnDetector:
    """Get or create global turn detector instance."""
    global _turn_detector
    if _turn_detector is None:
        _turn_detector = TurnDetector(**kwargs)
    return _turn_detector
