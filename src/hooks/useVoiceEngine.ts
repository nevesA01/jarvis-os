import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "command"
  | "processing"
  | "speaking"
  | "demo";

/* ---- Minimal typings for the Web Speech API (not in TS DOM lib) ---- */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}

const WAKE_WORDS = ["jarvis", "jervis", "jarves", "jarvic", "jar vis"];
const WAKE_REGEX = new RegExp(`\\b(${WAKE_WORDS.join("|")})\\b`, "i");
const SILENCE_MS = 5000;
const RESTART_DELAY_MS = 180;
const DEMO_EMIT_MS = 14000;

const DEMO_COMMANDS = [
  "Verificar o status dos containers Docker na VPS",
  "Auditar portas abertas no firewall e vulnerabilidades",
  "Criar uma rota FastAPI com validação Pydantic",
  "Pesquisar a melhor forma de orquestrar agentes com LangGraph",
];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Remove markdown/code para uma fala natural e curta */
const toSpeech = (raw: string) => {
  const clean = raw
    .replace(/```[\s\S]*?```/g, " Bloco de código gerado com sucesso. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_#>|]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  let out = "";
  for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
    if (out.length + sentence.length > 260) break;
    out += (out ? " " : "") + sentence;
  }
  return (out || clean.slice(0, 260)).slice(0, 300);
};

/** Escolhe a voz pt-BR mais natural disponível (vozes neurais primeiro) */
const pickVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const ptBr = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === "pt-br");
  const pt = ptBr.length ? ptBr : voices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  if (!pt.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    let s = v.lang.toLowerCase().replace("_", "-") === "pt-br" ? 100 : 0;
    if (n.includes("natural") || n.includes("online")) s += 80;
    if (n.includes("google")) s += 70;
    if (n.includes("neural") || n.includes("premium") || n.includes("enhanced")) s += 50;
    if (/luciana|francisca|antonio|thiago|maria/.test(n)) s += 20;
    if (v.default) s += 5;
    return s;
  };
  return pt.reduce((best, v) => (score(v) > score(best) ? v : best), pt[0]);
};

export interface UseVoiceEngineReturn {
  status: VoiceStatus;
  micLevel: number;
  transcript: string;
  lastCommand: string | null;
  isSupported: boolean;
  isEnabled: boolean;
  voiceOutput: boolean;
  toggleVoiceOutput: () => void;
  speakIfEnabled: (raw: string) => void;
  toggle: () => void;
}

export const useVoiceEngine = (onCommand: (text: string) => void): UseVoiceEngineReturn => {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );

  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  const statusRef = useRef<VoiceStatus>("idle");
  const enabledRef = useRef(false);
  const suspendedRef = useRef(false);
  const demoRef = useRef(false);
  const voiceOutputRef = useRef(voiceOutput);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const speakTokenRef = useRef(0);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const commandBufferRef = useRef("");
  const demoIndexRef = useRef(0);
  const demoTimersRef = useRef<number[]>([]);

  useEffect(() => {
    voiceOutputRef.current = voiceOutput;
  }, [voiceOutput]);

  /* Carrega vozes cedo (Chrome popula de forma assíncrona) */
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, []);

  const idleStatus = useCallback(
    (): VoiceStatus =>
      demoRef.current ? "demo" : enabledRef.current ? "listening" : "idle",
    []
  );

  const updateStatus = useCallback((s: VoiceStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  /* ---------- Audio feedback (WebAudio beeps) ---------- */
  const playChime = useCallback((rising: boolean) => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "closed") return;
      const t0 = ctx.currentTime;
      [0, 0.13].forEach((d, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = rising ? 640 + i * 240 : 520 - i * 140;
        gain.gain.setValueAtTime(0.0001, t0 + d);
        gain.gain.exponentialRampToValueAtTime(0.09, t0 + d + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.24);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + d);
        osc.stop(t0 + d + 0.28);
      });
    } catch {
      /* noop */
    }
  }, []);

  const ensureAudioCtx = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        const Ctor =
          window.AudioContext || (window as any).webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      audioCtxRef.current?.resume?.();
    } catch {
      /* noop */
    }
  }, []);

  /* ---------- Live mic level (analyser) ---------- */
  const startLevelMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      const ctx: AudioContext = new Ctor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      const loop = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length) / 255;
        setMicLevel(Math.min(1, rms * 2.8));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setMicLevel(0);
    }
  }, []);

  const stopLevelMeter = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      audioCtxRef.current?.close();
    } catch {
      /* noop */
    }
    audioCtxRef.current = null;
    setMicLevel(0);
  }, []);

  /* ---------- Command capture ---------- */
  const clearSilence = () => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const finalizeCommand = useCallback(() => {
    clearSilence();
    const text = commandBufferRef.current.trim();
    commandBufferRef.current = "";
    setTranscript("");
    if (text.length < 2) {
      updateStatus(idleStatus());
      return;
    }
    setLastCommand(text);
    updateStatus("processing");
    playChime(false);
    onCommandRef.current(text);
  }, [idleStatus, playChime, updateStatus]);

  const resetSilenceTimer = useCallback(() => {
    clearSilence();
    silenceTimerRef.current = window.setTimeout(finalizeCommand, SILENCE_MS);
  }, [finalizeCommand]);

  /* ---------- Demo fallback ---------- */
  const clearDemoTimers = useCallback(() => {
    demoTimersRef.current.forEach((t) => window.clearInterval(t));
    demoTimersRef.current = [];
  }, []);

  const enterDemo = useCallback(() => {
    demoRef.current = true;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    updateStatus("demo");
    setTranscript("");

    const levelTimer = window.setInterval(() => {
      const t = Date.now();
      setMicLevel(
        Math.min(
          1,
          0.18 +
            Math.abs(Math.sin(t / 320)) * 0.42 +
            Math.abs(Math.sin(t / 90)) * 0.18 +
            Math.random() * 0.08
        )
      );
    }, 90);
    const emitTimer = window.setInterval(() => {
      if (statusRef.current !== "demo") return;
      const text = DEMO_COMMANDS[demoIndexRef.current % DEMO_COMMANDS.length];
      demoIndexRef.current += 1;
      setLastCommand(text);
      updateStatus("processing");
      playChime(false);
      onCommandRef.current(text);
    }, DEMO_EMIT_MS);
    demoTimersRef.current = [levelTimer, emitTimer];
  }, [playChime, updateStatus]);

  /* ---------- Speech recognition lifecycle ---------- */
  const restartRecognition = useCallback(() => {
    if (!enabledRef.current || suspendedRef.current || demoRef.current) return;
    if (restartTimerRef.current !== null) return;
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      try {
        recognitionRef.current?.start();
      } catch {
        /* already started */
      }
    }, RESTART_DELAY_MS);
  }, []);

  const createRecognition = useCallback((): SpeechRecognitionLike | null => {
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return null;
    const rec: SpeechRecognitionLike = new Ctor();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += text + " ";
        else interim += text;
      }

      if (statusRef.current === "command") {
        if (finalText) {
          commandBufferRef.current = (commandBufferRef.current + " " + finalText)
            .replace(/\s+/g, " ")
            .trim();
        }
        setTranscript((commandBufferRef.current + " " + interim).trim());
        resetSilenceTimer();
        return;
      }

      // Wake-word detection on final results
      if (!finalText) return;
      if (WAKE_REGEX.test(normalize(finalText))) {
        const remainder = finalText
          .replace(WAKE_REGEX, " ")
          .replace(/\s+/g, " ")
          .trim();
        commandBufferRef.current = remainder;
        updateStatus("command");
        playChime(true);
        setTranscript(remainder);
        resetSilenceTimer();
      }
    };

    rec.onerror = (e) => {
      const err = (e as any).error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        clearDemoTimers();
        enterDemo();
      }
      // "no-speech" / "network": onend handles the restart
    };

    rec.onend = () => {
      if (!enabledRef.current || suspendedRef.current || demoRef.current) return;
      restartRecognition();
    };

    return rec;
  }, [clearDemoTimers, enterDemo, playChime, resetSilenceTimer, restartRecognition, updateStatus]);

  /* ---------- Text-to-speech ---------- */
  const speak = useCallback(
    (raw: string) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        window.setTimeout(() => {
          if (statusRef.current === "processing") updateStatus(idleStatus());
        }, 500);
        return;
      }
      const text = toSpeech(raw);
      if (!text) {
        updateStatus(idleStatus());
        return;
      }
      synth.cancel();
      suspendedRef.current = true;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      updateStatus("speaking");
      playChime(true);

      // Frases curtas preservam pausas naturais sem criar cortes artificiais.
      const chunks: string[] = [];
      let buf = "";
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        if (buf && (buf + " " + sentence).length > 190) {
          chunks.push(buf);
          buf = sentence;
        } else {
          buf = buf ? `${buf} ${sentence}` : sentence;
        }
      }
      if (buf) chunks.push(buf);

      const voice = pickVoice(voicesRef.current.length ? voicesRef.current : synth.getVoices());
      const token = ++speakTokenRef.current;
      const done = () => {
        if (speakTokenRef.current !== token) return;
        suspendedRef.current = false;
        updateStatus(idleStatus());
        restartRecognition();
      };

      chunks.forEach((chunk, i) => {
        const utter = new SpeechSynthesisUtterance(chunk);
        utter.lang = "pt-BR";
        if (voice) utter.voice = voice;
        utter.rate = 1.12;
        utter.pitch = 1.02;
        utter.volume = 1;
        if (i === chunks.length - 1) {
          utter.onend = done;
          utter.onerror = done;
        }
        synth.speak(utter);
      });
    },
    [idleStatus, playChime, restartRecognition, updateStatus]
  );

  const speakIfEnabled = useCallback(
    (raw: string) => {
      if (!voiceOutputRef.current) {
        window.setTimeout(() => {
          if (statusRef.current === "processing") updateStatus(idleStatus());
        }, 500);
        return;
      }
      speak(raw);
    },
    [idleStatus, speak, updateStatus]
  );

  /* ---------- Public controls ---------- */
  const start = useCallback(() => {
    enabledRef.current = true;
    ensureAudioCtx();
    updateStatus("requesting");
    startLevelMeter();

    if (!isSupported) {
      enterDemo();
      return;
    }
    const rec = createRecognition();
    if (!rec) {
      enterDemo();
      return;
    }
    recognitionRef.current = rec;
    try {
      rec.start();
      updateStatus("listening");
    } catch {
      /* onend will retry */
    }
  }, [createRecognition, ensureAudioCtx, enterDemo, isSupported, startLevelMeter, updateStatus]);

  const stop = useCallback(() => {
    enabledRef.current = false;
    suspendedRef.current = false;
    demoRef.current = false;
    clearSilence();
    clearDemoTimers();
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    stopLevelMeter();
    speakTokenRef.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    commandBufferRef.current = "";
    setTranscript("");
    updateStatus("idle");
  }, [clearDemoTimers, stopLevelMeter, updateStatus]);

  const toggle = useCallback(() => {
    if (enabledRef.current) stop();
    else start();
  }, [start, stop]);

  const toggleVoiceOutput = useCallback(() => {
    setVoiceOutput((v) => {
      const next = !v;
      voiceOutputRef.current = next;
      if (!next) {
        speakTokenRef.current += 1;
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      }
      if (!next && statusRef.current === "speaking") {
        suspendedRef.current = false;
        updateStatus(idleStatus());
        restartRecognition();
      }
      return next;
    });
  }, [idleStatus, restartRecognition, updateStatus]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      enabledRef.current = false;
      clearSilence();
      clearDemoTimers();
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    micLevel,
    transcript,
    lastCommand,
    isSupported,
    isEnabled: status !== "idle",
    voiceOutput,
    toggleVoiceOutput,
    speakIfEnabled,
    toggle,
  };
};
