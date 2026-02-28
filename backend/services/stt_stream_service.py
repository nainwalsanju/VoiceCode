import structlog
from typing import Optional
import asyncio
import io
try:
    import moonshine_onnx
except ImportError:
    moonshine_onnx = None

logger = structlog.get_logger()

DEFAULT_MODEL = "moonshine/tiny"
DEFAULT_DEVICE = "cpu"

_moonshine_model = None
_current_model_name: Optional[str] = None


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

        return {"text": full_text.strip(), "language": info_lang, "is_final": True}
    except Exception as e:
        logger.error("transcription_stream_error", error=str(e))
        return {"text": "", "language": "en", "error": str(e), "is_final": True}
