import asyncio
import websockets
import json
import base64

async def test_websocket():
    uri = "ws://localhost:8000/agent/stream"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket.")
            
            # Wait for ready message
            ready_msg = await websocket.recv()
            print(f"Received: {ready_msg}")
            
            # Send a dummy audio chunk (Valid WAV format with 1 sec silence)
            import wave
            import io
            wav_io = io.BytesIO()
            with wave.open(wav_io, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16000)
                wav_file.writeframes(b'\x00' * 32000)
            
            b64_data = base64.b64encode(wav_io.getvalue()).decode('utf-8')
            
            msg = {"type": "audio", "data": b64_data}
            await websocket.send(json.dumps(msg))
            print("Sent audio chunk.")
            
            # Keep receiving messages
            while True:
                response = await websocket.recv()
                print(f"Received from server: {response[:100]}...")

    except Exception as e:
        print(f"WebSocket Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
