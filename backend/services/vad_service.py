"""
Voice Activity Detection (VAD) Service using Silero VAD.

Provides real-time voice activity detection for detecting when user starts/stops speaking.
Requirements: AUDIO-02
"""

import structlog
import numpy as np
import asyncio
from typing import Optional, Callable, AsyncGenerator
from dataclasses import dataclass

logger = structlog.get_logger()

# Silero VAD configuration
DEFAULT_SAMPLE_RATE = 16000
DEFAULT_WINDOW_SIZE = 512
DEFAULT_THRESHOLD = 0.5
DEFAULT_MIN_SPEECH_DURATION_MS = 250
DEFAULT_MIN_SILENCE_DURATION_MS = 500

# Speech state constants
SPEECH_START = "speech_start"
SPEECH_END = "speech_end"
VOICE_ACTIVE = "voice_active"
NO_VOICE = "no_voice"


@dataclass
class VADResult:
    """Result from VAD processing."""
    speech: bool
    confidence: float
    state: str  # speech_start, speech_end, voice_active, no_voice


class SileroVADService:
    """
    Silero VAD integration for voice activity detection.
    
    Handles real-time audio stream processing to detect:
    - When speech begins (voice activation)
    - When speech ends (turn endpointing)
    """
    
    def __init__(
        self,
        threshold: float = DEFAULT_THRESHOLD,
        min_speech_duration_ms: int = DEFAULT_MIN_SPEECH_DURATION_MS,
        min_silence_duration_ms: int = DEFAULT_MIN_SILENCE_DURATION_MS,
        sample_rate: int = DEFAULT_SAMPLE_RATE,
    ):
        self.threshold = threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.min_silence_duration_ms = min_silence_duration_ms
        self.sample_rate = sample_rate
        
        self._model = None
        self._model_loaded = False
        self._speech_active = False
        self._speech_start_time: Optional[float] = None
        self._silence_duration_ms = 0
        self._last_speech_time: Optional[float] = None
        
        # Callbacks for state changes
        self._on_speech_start: Optional[Callable] = None
        self._on_speech_end: Optional[Callable] = None
        
        logger.info(
            "vad_service_init",
            threshold=threshold,
            min_speech_duration_ms=min_speech_duration_ms,
            min_silence_duration_ms=min_silence_duration_ms,
            sample_rate=sample_rate,
        )

    async def load_model(self):
        """Load the Silero VAD model."""
        if self._model_loaded:
            return
            
        try:
            # Import Silero VAD
            import torch
            import torchaudio
            
            # Load Silero VAD model
            torch.set_num_threads(1)
            self._model, utils = torch.hub.load(
                "snakers4/silero-vad",
                "silero_vad",
                force_reload=False,
                verbose=False
            )
            
            self._model.eval()
            self._model_loaded = True
            logger.info("silero_vad_model_loaded")
            
        except ImportError as e:
            logger.warning("silero_vad_import_error", error=str(e))
            # Fall back to simple energy-based detection
            self._model = None
            self._model_loaded = True
        except Exception as e:
            logger.error("silero_vad_load_error", error=str(e))
            self._model = None
            self._model_loaded = True

    def _detect_energy_based(self, audio: np.ndarray) -> float:
        """
        Fallback energy-based voice detection.
        
        Uses root mean square (RMS) energy to detect voice activity.
        Simple but effective for clean audio.
        """
        if len(audio) == 0:
            return 0.0
            
        # Calculate RMS energy
        rms = np.sqrt(np.mean(audio ** 2))
        
        # Convert to confidence (0-1) based on typical speech energy
        # Typical speech RMS is around 0.01-0.1
        confidence = min(1.0, rms / 0.02)
        
        return confidence

    async def detect_voice(
        self,
        audio_chunk: bytes,
        timestamp_ms: float = 0,
    ) -> VADResult:
        """
        Detect voice activity in audio chunk.
        
        Args:
            audio_chunk: Raw audio bytes (16-bit PCM)
            timestamp_ms: Current position in audio stream
            
        Returns:
            VADResult with speech detection info
        """
        # Load model if not loaded
        if not self._model_loaded:
            await self.load_model()
            
        # Convert bytes to numpy array
        audio_np = self._bytes_to_numpy(audio_chunk)
        
        if len(audio_np) == 0:
            return VADResult(speech=False, confidence=0.0, state=NO_VOICE)
            
        # Get voice activity detection
        if self._model is not None:
            confidence = await self._detect_with_model(audio_np)
        else:
            confidence = self._detect_energy_based(audio_np)
            
        return self._update_speech_state(confidence, timestamp_ms)

    async def _detect_with_model(self, audio: np.ndarray) -> float:
        """Detect voice using Silero VAD model."""
        try:
            import torch
            
            # Ensure audio is float32 in range [-1, 1]
            if audio.dtype != np.float32:
                audio = audio.astype(np.float32) / 32768.0
                
            # Silero expects 1D tensor
            if len(audio.shape) > 1:
                audio = audio.squeeze()
                
            # Run VAD inference
            with torch.no_grad():
                speech_probabilities = self._model(
                    torch.from_numpy(audio),
                    self.sample_rate
                )
                
            # Return the max probability as confidence
            if hasattr(speech_probabilities, 'numpy'):
                return float(torch.max(speech_probabilities).numpy())
            return float(torch.max(speech_probabilities))
            
        except Exception as e:
            logger.error("vad_model_inference_error", error=str(e))
            return self._detect_energy_based(audio)

    def _bytes_to_numpy(self, audio_bytes: bytes) -> np.ndarray:
        """Convert audio bytes to numpy array."""
        import struct
        
        # Assume 16-bit PCM
        num_samples = len(audio_bytes) // 2
        audio = np.array(
            struct.unpack(f"{num_samples}h", audio_bytes),
            dtype=np.int16
        )
        return audio

    def _update_speech_state(self, confidence: float, timestamp_ms: float) -> VADResult:
        """Update internal speech state based on confidence."""
        import time
        
        current_time = time.time() * 1000  # Convert to ms
        
        speech_detected = confidence >= self.threshold
        
        if speech_detected and not self._speech_active:
            # Speech just started
            self._speech_active = True
            self._speech_start_time = current_time
            self._silence_duration_ms = 0
            
            logger.debug("vad_speech_start", confidence=confidence)
            
            return VADResult(
                speech=True,
                confidence=confidence,
                state=SPEECH_START
            )
            
        elif speech_detected and self._speech_active:
            # Continuing speech
            self._last_speech_time = current_time
            self._silence_duration_ms = 0
            
            return VADResult(
                speech=True,
                confidence=confidence,
                state=VOICE_ACTIVE
            )
            
        elif not speech_detected and self._speech_active:
            # Speech ended, track silence duration
            if self._last_speech_time is not None:
                self._silence_duration_ms = current_time - self._last_speech_time
            
            # Check if silence exceeds threshold
            if self._silence_duration_ms >= self.min_silence_duration_ms:
                self._speech_active = False
                
                logger.debug(
                    "vad_speech_end",
                    silence_duration_ms=self._silence_duration_ms
                )
                
                return VADResult(
                    speech=False,
                    confidence=confidence,
                    state=SPEECH_END
                )
            else:
                # Still in grace period
                return VADResult(
                    speech=True,
                    confidence=confidence,
                    state=VOICE_ACTIVE
                )
        
        # No voice detected
        return VADResult(
            speech=False,
            confidence=confidence,
            state=NO_VOICE
        )

    def set_threshold(self, threshold: float):
        """Update VAD threshold."""
        self.threshold = max(0.0, min(1.0, threshold))
        logger.info("vad_threshold_updated", threshold=self.threshold)

    def set_silence_threshold(self, duration_ms: int):
        """Update minimum silence duration to detect speech end."""
        self.min_silence_duration_ms = duration_ms
        logger.info("vad_silence_threshold_updated", duration_ms=duration_ms)

    def reset(self):
        """Reset VAD state."""
        self._speech_active = False
        self._speech_start_time = None
        self._silence_duration_ms = 0
        self._last_speech_time = None
        logger.debug("vad_state_reset")

    def is_speaking(self) -> bool:
        """Check if currently detecting speech."""
        return self._speech_active


# Global singleton instance
_vad_service: Optional[SileroVADService] = None


def get_vad_service(**kwargs) -> SileroVADService:
    """Get or create the global VAD service instance."""
    global _vad_service
    if _vad_service is None:
        _vad_service = SileroVADService(**kwargs)
    return _vad_service
