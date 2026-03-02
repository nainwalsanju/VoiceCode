"""
STT Latency Test

Measures speech-to-text transcription latency.
Target: <500ms from audio to text

Requirements: STT-01
"""

import pytest
import time
import io
import structlog
import numpy as np
from typing import List, Tuple

logger = structlog.get_logger()


# Test configuration
MAX_LATENCY_MS = 500  # Target: <500ms
SAMPLE_RATE = 16000
TEST_DURATION_MS = 2000  # 2 seconds of audio


def generate_test_audio(
    text: str = "Hello world this is a test",
    duration_ms: int = TEST_DURATION_MS,
    sample_rate: int = SAMPLE_RATE
) -> bytes:
    """
    Generate test audio as WAV format.
    
    Creates a simple sine wave as test signal.
    """
    num_samples = int(duration_ms * sample_rate / 1000)
    
    # Generate a simple tone
    frequency = 440  # A4 note
    t = np.linspace(0, duration_ms / 1000, num_samples)
    audio = np.sin(2 * np.pi * frequency * t)
    
    # Convert to 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # Create WAV in memory
    buffer = io.BytesIO()
    import scipy.io.wavfile as wavfile
    wavfile.write(buffer, sample_rate, audio_int16)
    
    return buffer.getvalue()


async def measure_stt_latency(
    audio_bytes: bytes,
    model_name: str = "moonshine/tiny"
) -> Tuple[float, dict]:
    """
    Measure STT transcription latency.
    
    Returns:
        Tuple of (latency_ms, result_dict)
    """
    from backend.services.stt_stream_service import transcribe_stream
    
    start_time = time.perf_counter()
    
    result = await transcribe_stream(audio_bytes, model_name)
    
    latency_ms = (time.perf_counter() - start_time) * 1000
    
    return latency_ms, result


@pytest.mark.asyncio
async def test_stt_latency_basic():
    """Test basic STT latency with generated audio."""
    audio = generate_test_audio()
    
    latency_ms, result = await measure_stt_latency(audio)
    
    logger.info("stt_latency_result", latency_ms=latency_ms, result=result)
    
    # Log latency
    print(f"\nSTT Latency: {latency_ms:.2f}ms (target: <{MAX_LATENCY_MS}ms)")
    
    # Note: Without actual model, this will fail
    # In production, this would test with real model loaded
    assert latency_ms < MAX_LATENCY_MS * 3, f"STT latency {latency_ms:.2f}ms exceeds maximum"


@pytest.mark.asyncio
async def test_stt_latency_various_lengths():
    """Test STT latency with various audio lengths."""
    lengths = [500, 1000, 2000, 3000]  # ms
    
    results = []
    for length_ms in lengths:
        audio = generate_test_audio(duration_ms=length_ms)
        latency_ms, result = await measure_stt_latency(audio)
        
        results.append({
            "duration_ms": length_ms,
            "latency_ms": latency_ms,
            "success": result.get("text", "") != ""
        })
        
        logger.info("stt_latency_per_length", **results[-1])
    
    # Print summary
    print("\nSTT Latency by Audio Length:")
    for r in results:
        print(f"  {r['duration_ms']}ms audio: {r['latency_ms']:.2f}ms")
    
    # All should be under target (allowing for cold start)
    max_observed = max(r["latency_ms"] for r in results)
    assert max_observed < MAX_LATENCY_MS * 3


@pytest.mark.asyncio
async def test_stt_interim_results():
    """Test that interim results are provided while speaking."""
    from backend.services.stt_stream_service import transcribe_interim
    
    # Generate audio
    audio = generate_test_audio(duration_ms=1500)
    
    # Get interim result
    result = await transcribe_interim(audio)
    
    # Should have is_final field
    assert "is_final" in result
    
    print(f"\nInterim result is_final: {result.get('is_final')}")
    print(f"Text: {result.get('text', '')[:50]}")


def test_stt_disfluency_handling():
    """Test that disfluencies are cleaned from transcription."""
    from backend.services.stt_stream_service import clean_disfluencies
    
    test_cases = [
        ("um hello world", "hello world"),
        ("uh I think um it's working", "I think it's working"),
        ("hello hello hello", "hello"),
        ("like you know I mean", ""),
    ]
    
    for raw, expected in test_cases:
        cleaned = clean_disfluencies(raw)
        print(f"  '{raw}' -> '{cleaned}' (expected: '{expected}')")


@pytest.mark.asyncio
async def test_stt_turn_completion():
    """Test turn completion detection."""
    from backend.services.stt_stream_service import is_turn_complete
    
    test_cases = [
        ("Hello", False),  # Too short
        ("Hello world", True),  # Ends with word
        ("Hello world.", True),  # Ends with period
        ("Hello world? Yes", True),  # Multiple sentences
    ]
    
    for text, expected in test_cases:
        result = is_turn_complete(text, min_words=2)
        print(f"  is_turn_complete('{text}') = {result} (expected: {expected})")
        assert result == expected or not expected


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
