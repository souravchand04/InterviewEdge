import * as Vosk from 'vosk-browser';

let model = null;
let isInitialized = false;
let initPromise = null;

export async function initVosk() {
  if (isInitialized) return model;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("Attempting to initialize Vosk model...");
    try {
      console.log("Pre-flight check: verifying Vosk model URL accessibility...");
      const checkRes = await fetch('https://huggingface.co/AlphaBoom/vosk-model-small-en-us/resolve/main/model.tar.gz', { method: 'HEAD' });
      if (!checkRes.ok) {
        throw new Error(`Model URL is not accessible (HTTP ${checkRes.status})`);
      }
      console.log("Pre-flight check passed. Loading Vosk model...");

      const modelPromise = Vosk.createModel(
        'https://huggingface.co/AlphaBoom/vosk-model-small-en-us/resolve/main/model.tar.gz'
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Vosk initialization timed out (5s)")), 5000)
      );
      model = await Promise.race([modelPromise, timeoutPromise]);
      isInitialized = true;
      console.log("Vosk model initialized successfully!");
      return model;
    } catch (err) {
      console.warn('Vosk init failed, falling back to webkitSpeechRecognition:', err);
      isInitialized = false;
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export function createSpeechRecognition({ onResult, onEnd, onError }) {
  if (model && isInitialized) {
    console.log("createSpeechRecognition: Using offline Vosk engine.");
    let mediaStream = null;
    let audioContext = null;
    let recognizer = null;
    let sourceNode = null;
    let scriptNode = null;
    let recording = false;

    const start = async () => {
      console.log("Vosk engine: start() invoked.");
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate: 16000
          },
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.sampleRate !== 16000) {
          audioContext.close();
          audioContext = new AudioContext({ sampleRate: 16000 });
        }

        recognizer = new model.KaldiRecognizer(audioContext.sampleRate);
        recognizer.on('result', (msg) => {
          console.log("Vosk on result:", msg.result.text);
          onResult({ result: [{ transcript: msg.result.text }] });
        });
        recognizer.on('partial-result', (msg) => {
          onResult({ result: [{ transcript: msg.partial }] });
        });
        recognizer.on('error', (err) => {
          console.error("Vosk recognizer error:", err);
          onError({ error: 'network' });
        });

        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
        scriptNode.onaudioprocess = (e) => {
          if (!recording) return;
          try {
            recognizer.acceptWaveform(e.inputBuffer);
          } catch {}
        };

        sourceNode.connect(scriptNode);
        recording = true;
        console.log("Vosk engine: listening actively.");
      } catch (err) {
        console.error("Vosk engine: microphone access failed", err);
        onError({ error: 'network' });
      }
    };

    const stop = () => {
      console.log("Vosk engine: stop() invoked.");
      recording = false;
      try {
        if (scriptNode) { scriptNode.disconnect(); scriptNode = null; }
        if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        if (audioContext) audioContext.close();
      } catch (err) {
        console.error("Vosk engine: stop cleanup error", err);
      }
    };

    return { start, stop, abort: stop };
  }

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    console.log("createSpeechRecognition: Using native Web Speech API (webkitSpeechRecognition) fallback.");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    let isListening = false;

    recognition.onstart = () => {
      console.log("Native Web Speech API: started listening.");
      isListening = true;
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[event.resultIndex]?.[0]?.transcript;
      console.log("Native Web Speech API: raw result index", event.resultIndex, "transcript:", transcript);
      if (transcript) {
        onResult({ result: [{ transcript }] });
      }
    };

    recognition.onend = () => {
      console.log("Native Web Speech API: ended listening.");
      isListening = false;
      onEnd();
    };

    recognition.onerror = (e) => {
      console.error("Native Web Speech API error event:", e.error, e);
      isListening = false;
      onError(e);
    };

    return {
      start: () => {
        if (isListening) {
          console.log("Native Web Speech API: already listening, skipping start().");
          return;
        }
        try {
          console.log("Native Web Speech API: start() invoked.");
          recognition.start();
          isListening = true;
        } catch (err) {
          console.error("Native Web Speech API: start failed", err);
        }
      },
      stop: () => {
        if (!isListening) {
          console.log("Native Web Speech API: not listening, skipping stop().");
          return;
        }
        try {
          console.log("Native Web Speech API: stop() invoked.");
          recognition.stop();
          isListening = false;
        } catch (err) {
          console.error("Native Web Speech API: stop failed", err);
        }
      },
      abort: () => {
        if (!isListening) {
          console.log("Native Web Speech API: not listening, skipping abort().");
          return;
        }
        try {
          console.log("Native Web Speech API: abort() invoked.");
          recognition.abort();
          isListening = false;
        } catch (err) {
          console.error("Native Web Speech API: abort failed", err);
        }
      },
    };
  }

  console.error("Speech Recognition: support not found in this browser.");
  onError({ error: 'not-supported' });
  return { start: () => {}, stop: () => {} };
}