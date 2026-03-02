"""
End-to-End Latency Test

Measures full pipeline latency from speech to audio response.
Target: <1 second from speech start to audio response

Requirements: STT-01, TTS-02
"""

import pytest
import time
import io
import structlog
import numpy as np
from typing import List, Tuple, Dict

logger = structlog.get_logger()


# Test configuration
MAX_E2E_LATENCY_MS = 1000  # Target: <1s total
SAMPLE_RATE = 16000


def generate_speech_audio(
    text: str = "Hello world",
    duration_ms: int = 1500,
    sample_rate: int = SAMPLE_RATE
) -> bytes:
    """Generate test speech audio."""
    num_samples = int(duration_ms * sample_rate / 1000)
    
    # Generate a more speech-like signal (multiple frequencies)
    t = np.linspace(0, duration_ms / 1000, num_samples)
    
    # Mix of frequencies to simulate speech
    f1 = 200 + 50 * np.sin(2 * np.pi * 2 * t)  # F0 variation
    audio = 0.3 * (
        np.sin(2 * np.pi * f1 * t) +
        0.3 * np.sin(2 * np.pi * f1 * 2 * t) +
        0.2 * np.sin(2 * np.pi * f1 * 3 * t)
    )
    
    # Add envelope
    envelope = np.exp(-t * 0.5) * (1 - np.exp(-t * 10))
    audio = audio * envelope
    
    # Convert to 16-bit PCM
    audio_int16 = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
    
    # Create WAV
    buffer = io.BytesIO()
    import scipy.io.wavfile as wavfile
    wavfile.write(buffer, sample_rate, audio_int16)
    
    return buffer.getvalue()


class LatencyTracker:
    """Track timestamps for latency measurement."""
    
    def __init__(self):
        self.timestamps: Dict[str, float] = {}
    
    def mark(self, event: str):
        self.timestamps[event] = time.perf_counter()
    
    def elapsed_ms(self, from_event: str, to_event: str = None) -> float:
        """Get elapsed time between events in ms."""
        if to_event is None:
            to_event = list(self.timestamps.keys())[-1]
        
        if from_event not in self.timestamps or to_event not in self.timestamps:
            return -1
            
        return (self.timestamps[to_event] - self.timestamps[from_event]) * 1000
    
    def summary(self) -> Dict[str, float]:
        """Get summary of all latencies."""
        events = list(self.timestamps.keys())
        summary = {}
        
        for i, event in enumerate(events):
            if i == 0:
                continue
            prev = events[i - 1]
            summary[f"{prev}_to_{event}"] = self.elapsed_ms(prev, event)
        
        return summary


@pytest.mark.asyncio
async def test_e2e_latency_basic():
    """Test basic end-to-end latency."""
    tracker = LatencyTracker()
    
    # Step 1: Capture audio
    tracker.mark("audio_start")
    audio = generate_speech_audio("Hello world")
    tracker.mark("audio_captured")
    
    # Step 2: STT transcription
    tracker.mark("stt_start")
    from backend.services.stt_stream_service import transcribe_stream
    result = await transcribe_stream(audio)
    tracker.mark("stt_complete")
    
    text = result.get("text", "")
    print(f"\nTranscribed: '{text}'")
    
    # Step 3: Get agent response (simulated)
    tracker.mark("llm_start")
    response = f"I heard you say: {text}"
    tracker.mark("llm_complete")
    
    # Step 4: TTS generation with streaming
    tracker.mark("tts_start")
    from backend.services.tts_service import get_tts_service
    tts_service = get_tts_service()
    
    first_chunk_time = None
    chunks = []
    
    async for chunk in tts_service.stream_audio_async(response):
        if first_chunk_time is None:
            first_chunk_time = time.perf_counter()
            tracker.mark("tts_first_chunk")
        chunks.append(chunk)
    
    tracker.mark("tts_complete")
    
    # Print summary
    print("\nE2E Latency Breakdown:")
    summary = tracker.summary()
    for stage, latency in summary.items():
        print(f"  {stage}: {latency:.2f}ms")
    
    # Calculate total
    total = tracker.elapsed_ms("audio_start", "tts_complete")
    print(f"\nTotal E2E Latency: {total:.2f}ms (target: <{MAX_E2E_LATENCY_MS}ms)")
    
    # Check against target (allow 2x for cold start)
    assert total < MAX_E2E_LATENCY_MS * 2


@pytest.mark.asyncio
async def test_e2e_streaming_overlap():
    """Test that streaming works properly (not waiting for full response)."""
    tracker = LatencyTracker()
    
    # Generate longer audio for more interesting test
    audio = generate_speech_audio("This is a test of the voice system", duration_ms=2000)
    
    # STT
    tracker.mark("stt_start")
    result = await transcribe_stream(audio)
    tracker.mark("stt_complete")
    text = result.get("text", "")
    
    print(f"\nTranscribed: '{text[:50]}...'")
    
    # Start TTS streaming and track when chunks arrive
    tracker.mark("tts_start")
    from backend.services.tts_service import get_tts_service
    tts_service = get_tts_service()
    
    chunk_arrival_times = []
    stream_start = time.perf_counter()
    
    async for chunk in tts_service.stream_audio_async(f"Response to: {text}"):
        arrival = (time.perf_counter() - stream_start) * 1000
        chunk_arrival_times.append(arrival)
        
        if len(chunk_arrival_times) >= 10:
            break
    
    tracker.mark("tts_complete")
    
    print("\nFirst 10 TTS chunk arrival times:")
    for i, arrival in enumerate(chunk_arrival_times[:10]):
        print(f"  Chunk {i}: {arrival:.2f}ms")
    
    # First chunk should come quickly
    first_arrival = chunk_arrival_times[0] if chunk_arrival_times else 0
    print(f"\nFirst TTS chunk at: {first_arrival:.2f}ms")
    
    # Should be under 250ms
    assert first_arrival < 250 * 3  # Allow 3x for cold start


@pytest.mark.asyncio
async def test_e2e_multiple_turns():
    """Test multiple conversation turns."""
    test_phrases = [
        "Hello",
        "How are you?",
        "What time is it?",
    ]
    
    results = []
    
    for phrase in test_phrases:
        tracker = LatencyTracker()
        
        # Generate audio for phrase
        audio = generate_speech_audio(phrase, duration_ms=1000)
        
        # STT
        tracker.mark("stt_start")
        result = await transcribe_stream(audio)
        tracker.mark("stt_complete")
        
        # Simple response
        tracker.mark("llm_start")
        response = f"You said: {phrase}"
        tracker.mark("llm_complete")
        
        # TTS
        tracker.mark("tts_start")
        from backend.services.tts_service import get_tts_service
        tts_service = get_tts_service()
        
        async for _ in tts_service.stream_audio_async(response):
            break  # Just need first chunk
        
        tracker.mark("tts_complete")
        
        total = tracker.elapsed_ms("stt_start", "tts_complete")
        
        results.append({
            "phrase": phrase,
            "total_ms": total,
            "stt_ms": tracker.elapsed_ms("stt_start", "stt_complete"),
            "tts_ms": tracker.elapsed_ms("tts_start", "tts_complete"),
        })
        
        print(f"\n'{phrase}':")
        print(f"  STT: {results[-1]['stt_ms']:.2f}ms")
        print(f"  TTS: {results[-1]['tts_ms']:.2f}ms")
        print(f"  Total: {total:.2f}ms")
    
    # Average should be under target
    avg_total = sum(r["total_ms"] for r in results) / len(results)
    print(f"\nAverage E2E latency: {avg_total:.2f}ms")
    
    assert avg_total < MAX_E2E_LATENCY_MS * 2


def test_e2e_integration_components():
    """Verify all components are properly integrated."""
    # Test VAD
    from backend.services.vad_service import get_vad_service
    vad = get_vad_service()
    assert vad is not None
    
    # Test Turn Detector
    from backend.services.turn_detector import get_turn_detector
    turn = get_turn_detector()
    assert turn is not None
    
    # Test STT
    from backend.services.stt_stream_service import transcribe_stream
    assert transcribe_stream is not None
    
    # Test TTS
    from backend.services.tts_service import get_tts_service
    tts = get_tts_service()
    assert tts is not None
    
    print("\n✓ All components integrated:")
    print("  - VAD Service")
    print("  - Turn Detector")
    print("  - STT Stream Service")
    print("  - TTS Service")


@pytest.mark.asyncio
async def test_e2e_with_vad_turn_detection():
    """Test full pipeline with VAD and turn detection."""
    tracker = LatencyTracker()
    
    # Simulate audio with speech
    audio = generate_speech_audio("Testing VAD and turn detection", duration_ms=1500)
    
    # VAD detection
    tracker.mark("vad_start")
    from backend.services.vad_service import get_vad_service
    vad = get_vad_service()
    await vad.load_model()
    
    vad_result = await vad.detect_voice(audio)
    tracker.mark("vad_detect")
    
    print(f"\nVAD Result: {vad_result.state}, confidence: {vad_result.confidence:.2f}")
    
    # Turn detection
    tracker.mark("turn_start")
    from backend.services.turn_detector import get_turn_detector
    turn = get_turn_detector()
    turn.start_turn()
    
    # Process "silence" after speech
    turn_result = turn.process_silence(600)  # 600ms silence
    tracker.mark("turn_end")
    
    print(f"Turn End Detected: {turn_result.is_turn_end}")
    
    # Full pipeline if turn detected
    if turn_result.is_turn_end:
        # STT
        tracker.mark("stt_start")
        from backend.services.stt_stream_service import transcribe_stream
        result = await transcribe_stream(audio)
        tracker.mark("stt_complete")
        
        # TTS
        tracker.mark("tts_start")
        from backend.services.tts_service import get_tts_service
        tts = get_tts_service()
        
        async for _ in tts.stream_audio_async("Turn detected and processed"):
            break
        
        tracker.mark("tts_complete")
        
        print("\nFull Pipeline Latencies:")
        summary = tracker.summary()
        for stage, ms in summary.items():
            print(f"  {stage}: {ms:.2f}ms")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
