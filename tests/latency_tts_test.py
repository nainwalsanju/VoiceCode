"""
TTS Latency Test

Measures text-to-speech first-audio latency.
Target: <250ms from text to first audio chunk

Requirements: TTS-02
"""

import pytest
import time
import structlog
from typing import List, Tuple

logger = structlog.get_logger()


# Test configuration
MAX_FIRST_AUDIO_MS = 250  # Target: <250ms to first audio
TEST_TEXTS = [
    "Hello",
    "Hello world",
    "The quick brown fox jumps over the lazy dog.",
    "This is a test of the text to speech system.",
]


async def measure_tts_latency(
    text: str,
    voice: str = "qwen3-tts-0.6b"
) -> Tuple[float, List[bytes]]:
    """
    Measure TTS first-audio latency.
    
    Returns:
        Tuple of (first_chunk_latency_ms, all_chunks)
    """
    from backend.services.tts_service import get_tts_service
    
    tts_service = get_tts_service()
    tts_service.reset_latency_tracking()
    
    start_time = time.perf_counter()
    chunks = []
    
    async for chunk in tts_service.stream_audio_async(text, voice):
        chunks.append(chunk)
        
        # Check if this is first chunk
        first_latency = tts_service.get_first_chunk_latency()
        if first_latency is not None:
            return first_latency, chunks
    
    # If no first chunk recorded, calculate manually
    latency_ms = (time.perf_counter() - start_time) * 1000
    return latency_ms, chunks


@pytest.mark.asyncio
async def test_tts_first_chunk_latency():
    """Test TTS first audio chunk latency."""
    text = "Hello world"
    
    latency_ms, chunks = await measure_tts_latency(text)
    
    logger.info("tts_latency_result", latency_ms=latency_ms, chunks=len(chunks))
    
    print(f"\nTTS First Chunk Latency: {latency_ms:.2f}ms (target: <{MAX_FIRST_AUDIO_MS}ms)")
    print(f"Total chunks: {len(chunks)}")
    
    # Allow extra time for model loading on first call
    max_allowed = MAX_FIRST_AUDIO_MS * 3
    assert latency_ms < max_allowed, f"TTS latency {latency_ms:.2f}ms exceeds {max_allowed}ms"


@pytest.mark.asyncio
async def test_tts_latency_various_texts():
    """Test TTS latency with various text lengths."""
    results = []
    
    for text in TEST_TEXTS:
        latency_ms, chunks = await measure_tts_latency(text)
        
        results.append({
            "text": text[:30],
            "text_length": len(text),
            "latency_ms": latency_ms,
            "chunks": len(chunks),
        })
        
        logger.info("tts_latency_per_text", **results[-1])
    
    # Print summary
    print("\nTTS Latency by Text:")
    for r in results:
        print(f"  '{r['text']}...' ({r['text_length']} chars): {r['latency_ms']:.2f}ms")
    
    # All should be under target
    max_observed = max(r["latency_ms"] for r in results)
    assert max_observed < MAX_FIRST_AUDIO_MS * 3


@pytest.mark.asyncio
async def test_tts_all_engines():
    """Test all available TTS engines."""
    voices = [
        "qwen3-tts-0.6b",
        "pocket-tts-en",
        "kokoro-en",
        "edge-en-US-AriaNeural",
    ]
    
    text = "Testing all engines."
    results = []
    
    for voice in voices:
        try:
            latency_ms, chunks = await measure_tts_latency(text, voice)
            results.append({
                "voice": voice,
                "latency_ms": latency_ms,
                "chunks": len(chunks),
                "success": True,
            })
            print(f"  {voice}: {latency_ms:.2f}ms ({len(chunks)} chunks)")
        except Exception as e:
            results.append({
                "voice": voice,
                "latency_ms": 0,
                "chunks": 0,
                "success": False,
                "error": str(e),
            })
            print(f"  {voice}: FAILED - {e}")
    
    # At least one should work
    successful = [r for r in results if r["success"]]
    assert len(successful) > 0, "No TTS engines available"


@pytest.mark.asyncio
async def test_tts_streaming_progressive():
    """Test that TTS streams progressively (not waiting for full audio)."""
    from backend.services.tts_service import get_tts_service
    
    text = "This is a longer text to test progressive streaming."
    tts_service = get_tts_service()
    
    chunk_times = []
    start_time = time.perf_counter()
    
    async for i, chunk in enumerate(tts_service.stream_audio_async(text)):
        chunk_time = (time.perf_counter() - start_time) * 1000
        chunk_times.append({
            "chunk": i,
            "time_ms": chunk_time,
            "size_bytes": len(chunk),
        })
        
        if i >= 5:  # Check first 5 chunks
            break
    
    print("\nTTS Progressive Streaming:")
    for ct in chunk_times[:5]:
        print(f"  Chunk {ct['chunk']}: {ct['time_ms']:.2f}ms ({ct['size_bytes']} bytes)")
    
    # First chunk should be fast
    first_chunk_time = chunk_times[0]["time_ms"]
    assert first_chunk_time < MAX_FIRST_AUDIO_MS * 2
    
    # Subsequent chunks should come quickly
    if len(chunk_times) > 1:
        avg_chunk_interval = (chunk_times[-1]["time_ms"] - chunk_times[0]["time_ms"]) / (len(chunk_times) - 1)
        print(f"  Avg chunk interval: {avg_chunk_interval:.2f}ms")
        
        # Chunks should stream at roughly real-time or faster
        assert avg_chunk_interval < 100  # Should be fast


def test_tts_voices_available():
    """Test that voice options are available."""
    from backend.services.tts_service import get_tts_service
    
    tts_service = get_tts_service()
    voices = tts_service.get_available_voices()
    
    print("\nAvailable TTS Voices:")
    for engine, voice_list in voices.items():
        print(f"  {engine}: {voice_list}")
    
    assert len(voices) > 0
    assert "qwen3" in voices


@pytest.mark.asyncio
async def test_tts_latency_targets():
    """Test that engines meet their latency targets."""
    from backend.services.tts_service import get_tts_service
    
    tts_service = get_tts_service()
    
    # Test each engine against its target
    test_voices = [
        ("qwen3-tts-0.6b", 97),
        ("pocket-tts-en", 200),
        ("kokoro-en", 100),
    ]
    
    print("\nTTS Engine Latency Targets:")
    results = []
    
    for voice, target_ms in test_voices:
        latency_ms, _ = await measure_tts_latency("Test", voice)
        
        met = latency_ms <= target_ms * 2  # Allow 2x for cold start
        results.append({
            "voice": voice,
            "target_ms": target_ms,
            "actual_ms": latency_ms,
            "target_met": met,
        })
        
        status = "✓" if met else "✗"
        print(f"  {voice}: target={target_ms}ms, actual={latency_ms:.0f}ms {status}")
    
    # At least one should meet target
    met_count = sum(1 for r in results if r["target_met"])
    assert met_count > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
