class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this._bytesWritten = 0;
    this._buffer = new Float32Array(this.bufferSize);
    this.init = false;
  }

  process(inputs) {
    //
    // `inputs` is an array of inputs, each input is an array of channels
    // and each channel is a Float32Array of 128 samples.
    const data = inputs[0][0];

    // Simple resampling: browser captures at sampleRate (e.g., 48000), Vosk needs 16000.
    // We take every 3rd sample.
    const resampled = new Float32Array(Math.floor(data.length / 3));
    for (let i = 0; i < resampled.length; i++) {
      resampled[i] = data[i * 3];
    }

    // Convert Float32 to PCM16
    const pcm16 = new Int16Array(resampled.length);
    for (let i = 0; i < resampled.length; i++) {
      let s = Math.max(-1, Math.min(1, resampled[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage(pcm16.buffer);

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);