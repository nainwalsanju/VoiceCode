import structlog
import re
from typing import Optional, List
import asyncio
import io

try:
    import moonshine_onnx
except ImportError:
    moonshine_onnx = None

logger = structlog.get_logger()

DEFAULT_MODEL = "moonshine/tiny"
DEFAULT_DEVICE = "cpu"

# Common disfluency patterns in natural speech
DISFLUENCY_PATTERNS = [
    # English disfluencies
    r'\b(um|uh|er|ah|hm|mmm|hmm)\b',
    r'\b(you know|like|I mean|sort of|kind of)\b',
    # Repeated words (stuttering)
    r'\b(\w+)\s+\1\b',
    # False starts
    r'^[a-z]+\s+[a-z]{2,}\s+([A-Z])',
]

# Common filler phrases to remove
FILLER_PHRASES = [
    'um', 'uh', 'er', 'ah', 'hm', 'hmm', 'mmm',
    'you know', 'like', 'I mean', 'sort of', 'kind of',
]

_moonshine_model = None
_current_model_name: Optional[str] = None


def clean_disfluencies(text: str, remove_fillers: bool = True) -> str:
    """
    Clean up disfluencies from transcribed text.
    
    Handles:
    - Filler words (um, uh, er, ah, etc.)
    - Repeated words (stuttering)
    - False starts
    
    Args:
        text: Raw transcribed text
        remove_fillers: Whether to remove filler words entirely
        
    Returns:
        Cleaned text
    """
    if not text:
        return text
        
    cleaned = text
    
    # Remove repeated words (stuttering like "I I I think")
    cleaned = re.sub(r'\b(\w+)(?:\s+\1){1,}\b', r'\1', cleaned, flags=re.IGNORECASE)
    
    # Handle common disfluency patterns
    if remove_fillers:
        # Remove individual filler words
        for filler in FILLER_PHRASES:
            # Word boundary matching for short fillers
            if len(filler) <= 3:
                pattern = r'\b' + re.escape(filler) + r'\b'
                cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
            else:
                # Phrase matching
                cleaned = re.sub(r'\b' + re.escape(filler) + r'\b', '', cleaned, flags=re.IGNORECASE)
    
    # Clean up extra spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Clean up leading/trailing punctuation and spaces
    cleaned = cleaned.strip(' .,!?-')
    cleaned = cleaned.strip()
    
    return cleaned


def is_turn_complete(text: str, min_words: int = 1) -> bool:
    """
    Determine if a transcribed turn appears complete.
    
    Checks for:
    - Ending punctuation
    - Minimum word count
    - Complete sentence structure
    
    Args:
        text: Transcribed text
        min_words: Minimum words required
        
    Returns:
        True if turn appears complete
    """
    if not text:
        return False
        
    word_count = len(text.split())
    
    if word_count < min_words:
        return False
        
    # Check for sentence-ending punctuation
    if text.strip().endswith(('.', '!', '?')):
        return True
        
    # Check for more complex sentence structure
    # Has multiple clauses separated by punctuation
    if re.search(r'[,.!?]\s+', text):
        # And ends with reasonable closure
        if text.strip()[-1] in 'drstlmn':
            # Likely incomplete (trailing off)
            return False
        return True
        
    return False


def extract_final_transcript(
    interim_text: str,
    final_text: str,
    preserve_partial: bool = False
) -> tuple[str, bool]:
    """
    Extract the best transcript from interim and final results.
    
    Args:
        interim_text: Latest interim transcription
        final_text: Previous final transcription  
        preserve_partial: Keep partial words from interim
        
    Returns:
        Tuple of (best_transcript, is_final)
    """
    if not interim_text and not final_text:
        return "", True
        
    if final_text and not interim_text:
        return clean_disfluencies(final_text), True
        
    if interim_text and not final_text:
        if preserve_partial:
            return interim_text, False
        # Try to extract complete words
        words = interim_text.split()
        if words and not words[-1].endswith((' ', '\n')):
            # Last word is partial, remove it
            words = words[:-1]
        cleaned = clean_disfluencies(' '.join(words))
        return cleaned, len(cleaned) > 0
        
    # Both exist - combine intelligently
    # Use final as base, add any new complete words from interim
    final_words = final_text.split()
    interim_words = interim_text.split()
    
    if len(interim_words) > len(final_words):
        # New words in interim
        new_words = interim_words[len(final_words):]
        combined = final_text + ' ' + ' '.join(new_words)
    else:
        combined = final_text
        
    return clean_disfluencies(combined), True


async def transcribe_interim(
    audio_chunk: bytes,
    model_name: str = DEFAULT_MODEL
) -> dict:
    """
    Transcribe audio with interim (partial) results.
    
    Used during active speaking to provide real-time feedback
    while user is still talking.
    
    Args:
        audio_chunk: Audio data bytes
        model_name: Model to use
        
    Returns:
        Dict with text, is_final, confidence
    """
    # For interim results, we use the same model but don't
    # wait for complete sentences
    result = await transcribe_stream(audio_chunk, model_name)
    
    # Mark as interim if text is short or doesn't end with punctuation
    is_final = result.get("is_final", True)
    
    if is_final:
        text = result.get("text", "")
        # Check if this looks like a complete utterance
        if text and is_turn_complete(text, min_words=3):
            result["is_final"] = True
        elif text:
            # Still interim - might continue
            result["is_final"] = False
            
    return result


def get_model(model_name: str = DEFAULT_MODEL):
    global _moonshine_model, _current_model_name

    if moonshine_onnx is None:
        raise ImportError("useful-moonshine-onnx is not installed.")

    if _current_model_name != model_name or _moonshine_model is None:
        logger.info("loading_stt_stream_model", model=model_name)
        
        # Expect model_name to be "moonshine/tiny" or similar
        ms_name = model_name.split("/")[-1] if "/" in model_name else model_name
        
        # Load the ONNX model into CPU memory using its actual API class
        _moonshine_model = moonshine_onnx.MoonshineOnnxModel(model_name=ms_name)

        _current_model_name = model_name
        logger.info("stt_stream_model_loaded", model=model_name)

    return _moonshine_model


async def transcribe_stream(
    audio_chunk: bytes, model_name: str = DEFAULT_MODEL
) -> dict:
    global _current_model_name
    model = get_model(model_name)

    try:
        full_text = ""
        info_lang = "en"  # Moonshine defaults to English/Multilingual blend

        # FFMPEG conversion without relying on system-installed executables
        # PyAV wraps FFMPEG libraries directly inside Python.
        import av
        import numpy as np

        audio_frames = []
        try:
            # Decode the WebM/Opus container directly from bytes
            with av.open(io.BytesIO(audio_chunk), format="webm") as container:
                stream = container.streams.audio[0]
                # Moonshine strictly requires 16kHz Mono audio
                resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
                
                for frame in container.decode(stream):
                    resampled_frames = resampler.resample(frame)
                    for r_frame in resampled_frames:
                        # Extract the ndarray representing PCM int16 data
                        audio_frames.append(r_frame.to_ndarray())
                        
            if not audio_frames:
                return {"text": "", "language": info_lang, "is_final": True}
                
            # Concatenate the audio blocks
            audio_array = np.concatenate(audio_frames, axis=1).squeeze()
            
            # Normalize to float32 between -1.0 and 1.0
            audio_array = audio_array.astype(np.float32) / 32768.0
            
            # Moonshine mathematically expects shape [1, N]
            if len(audio_array.shape) == 1:
                audio_array = np.expand_dims(audio_array, axis=0)

            # Generate returns raw token IDs: list of lists
            result_tokens = model.generate(audio_array)
            
            # Extract texts from tokens
            if isinstance(result_tokens, list) and len(result_tokens) > 0:
                first_sequence = result_tokens[0]
                
                try:
                    from moonshine_onnx import load_tokenizer
                    tokenizer = load_tokenizer()
                    translated_text = tokenizer.decode_batch(result_tokens) 
                    if isinstance(translated_text, list):
                        full_text = " ".join(translated_text)
                    else:
                        full_text = str(translated_text)
                except Exception as e:
                    logger.error("tokenizer_decode_error", error=str(e))
                    full_text = str(result_tokens)
                    
            elif isinstance(result_tokens, str):
                 full_text = result_tokens
                 
        except Exception as pyav_err:
             logger.error("pyav_decode_error", error=str(pyav_err))
             return {"text": "", "language": "en", "error": f"Audio processing failed: {str(pyav_err)}", "is_final": True}

        return {
            "text": full_text.strip(),
            "language": info_lang,
            "is_final": True,
            "cleaned": clean_disfluencies(full_text.strip())
        }
    except Exception as e:
        logger.error("transcription_stream_error", error=str(e))
        return {
            "text": "",
            "language": "en",
            "error": str(e),
            "is_final": True,
            "cleaned": ""
        }
