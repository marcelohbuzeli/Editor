// Transcrição no próprio aparelho com Whisper (transformers.js)
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0';

env.allowLocalModels = false;
let asr = null, current = null;

self.onmessage = async (e) => {
  const { audio, model } = e.data;
  try {
    if (!asr || current !== model) {
      self.postMessage({ type: 'status', msg: 'Carregando modelo…', pct: 5 });
      asr = await pipeline('automatic-speech-recognition', model, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: (p) => {
          if (p.status === 'progress' && p.total > 5e6) self.postMessage({ type: 'progress', pct: p.progress || 0 });
        },
      });
      current = model;
    }
    self.postMessage({ type: 'status', msg: 'Transcrevendo… pode levar alguns minutos', pct: 60 });
    const base = { language: 'portuguese', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 };
    let out;
    try {
      out = await asr(audio, { ...base, return_timestamps: 'word' });
    } catch (err) {
      console.warn('Sem tempos por palavra, usando por frase', err);
      out = await asr(audio, { ...base, return_timestamps: true });
    }
    const chunks = out.chunks && out.chunks.length ? out.chunks : [{ text: out.text, timestamp: [0, audio.length / 16000] }];
    self.postMessage({ type: 'done', chunks });
  } catch (err) {
    self.postMessage({ type: 'error', msg: String((err && err.message) || err) });
  }
};
