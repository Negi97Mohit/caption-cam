
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer to accumulate samples before sending
    this.bufferSize = 4096; // Larger buffer for better quality
    this.buffer = [];
    this.sampleRate = 48000; // Browser's typical sample rate
    this.targetSampleRate = 16000; // Vosk's required sample rate
    this.resampleRatio = this.sampleRate / this.targetSampleRate; // 3
  }

  // Proper linear interpolation resampling
  resample(inputBuffer) {
    const inputLength = inputBuffer.length;
    const outputLength = Math.floor(inputLength / this.resampleRatio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * this.resampleRatio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputLength - 1);
      const fraction = srcIndex - srcIndexFloor;

      // Linear interpolation between samples
      output[i] = inputBuffer[srcIndexFloor] * (1 - fraction) + 
                  inputBuffer[srcIndexCeil] * fraction;
    }

    return output;
  }

  // Convert Float32 [-1, 1] to Int16 PCM
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have valid input
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const inputData = input[0]; // First channel (mono)

    // Accumulate samples in buffer
    for (let i = 0; i < inputData.length; i++) {
      this.buffer.push(inputData[i]);
    }

    // When buffer is large enough, process and send
    if (this.buffer.length >= this.bufferSize) {
      const bufferArray = new Float32Array(this.buffer);
      
      // Resample to 16kHz
      const resampled = this.resample(bufferArray);
      
      // Convert to Int16 PCM
      const pcm16 = this.float32ToInt16(resampled);
      
      // Send to main thread
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
      
      // Clear buffer
      this.buffer = [];
    }

    return true; // Keep processor alive
  }
}

registerProcessor("audio-processor", AudioProcessor);
