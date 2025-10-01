
import asyncio
import websockets
import json
from vosk import Model, KaldiRecognizer, SetLogLevel
import os
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Update this path to your Vosk model location
MODEL_PATH = r"C:\Users\Dell\Desktop\caption-cam\server\vosk-model-small-en-us-0.15\vosk-model-small-en-us-0.15"

# Verify model exists
if not os.path.exists(MODEL_PATH):
    logger.error(f"Model not found at: {MODEL_PATH}")
    logger.error("Please download a Vosk model from: https://alphacephei.com/vosk/models")
    exit(1)

logger.info(f"Loading Vosk model from: {MODEL_PATH}")
model = Model(MODEL_PATH)
logger.info("✓ Model loaded successfully")

# Set Vosk log level (-1 = quiet, 0 = normal)
SetLogLevel(0)  # Use 0 for debugging, -1 for production

async def recognize(websocket):
    client_address = websocket.remote_address
    logger.info(f"✓ Client connected from {client_address}")
    
    # Create recognizer with 16kHz sample rate
    recognizer = KaldiRecognizer(model, 16000)
    recognizer.SetWords(True)  # Enable word-level timestamps
    
    chunks_received = 0
    transcripts_sent = 0
    
    try:
        async for message in websocket:
            chunks_received += 1
            
            # Log every 100 chunks
            if chunks_received % 100 == 0:
                logger.info(f"Received {chunks_received} audio chunks, sent {transcripts_sent} transcripts")
            
            # Check if message is binary (audio data)
            if isinstance(message, bytes):
                # Feed audio data to recognizer
                if recognizer.AcceptWaveform(message):
                    result = json.loads(recognizer.Result())
                    if result.get('text'):
                        transcripts_sent += 1
                        logger.info(f"✓ Final transcript: '{result['text']}'")
                        await websocket.send(json.dumps({'text': result['text']}))
                else:
                    # Partial result
                    partial_result = json.loads(recognizer.PartialResult())
                    if partial_result.get('partial'):
                        await websocket.send(json.dumps({'partial': partial_result['partial']}))
            else:
                logger.warning(f"Received non-binary message: {type(message)}")
                
    except websockets.exceptions.ConnectionClosedOK:
        logger.info(f"Client {client_address} disconnected normally")
    except websockets.exceptions.ConnectionClosedError as e:
        logger.warning(f"Client {client_address} connection closed with error: {e}")
    except Exception as e:
        logger.error(f"Error processing audio from {client_address}: {e}", exc_info=True)
    finally:
        # Get final result
        final_result = json.loads(recognizer.FinalResult())
        if final_result.get('text'):
            logger.info(f"Final result on disconnect: '{final_result['text']}'")
        logger.info(f"Session stats - Chunks: {chunks_received}, Transcripts: {transcripts_sent}")

async def main():
    logger.info("Starting Vosk WebSocket server...")
    
    server = await websockets.serve(
        recognize, 
        "localhost", 
        2700,
        ping_interval=20,  # Send ping every 20 seconds
        ping_timeout=10,   # Timeout after 10 seconds
        max_size=10 * 1024 * 1024  # 10MB max message size
    )
    
    logger.info("=" * 60)
    logger.info("✓ Vosk server started successfully!")
    logger.info("  Listening on: ws://localhost:2700")
    logger.info("  Model: vosk-model-small-en-us-0.15")
    logger.info("  Sample Rate: 16000 Hz")
    logger.info("=" * 60)
    
    await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
