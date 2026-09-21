import { useEffect, useRef } from "react";

export type SphereMode =
  | "idle"
  | "listening"
  | "command"
  | "processing"
  | "speaking"
  | "alert";

interface NeuralSphereProps {
  mode: SphereMode;
  /** 0..1 — nível do microfone ou intensidade de fala */
  energy: number;
  className?: string;
}

/**
 * Esfera neural estilo Stark: ~1400 pontos distribuídos numa esfera
 * (fibonacci sphere), conectados por linhas curtas. Reage ao modo:
 * - idle: rotação lenta, ciano tênue
 * - listening: respiração + partículas se expandindo levemente
 * - command: energia sobe com o microfone
 * - processing: rotação rápida, conexões faiscando
 * - speaking: pulso com a energia da fala
 * - alert: vermelho, tremor
 */
const NeuralSphere = ({ mode, energy, className }: NeuralSphereProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const energyRef = useRef(energy);
  modeRef.current = mode;
  energyRef.current = energy;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ---------- Particle field (fibonacci sphere) ---------- */
    const COUNT = 1400;
    const particles: {
      x: number; y: number; z: number;
      // turbulence
      tx: number; ty: number; tz: number;
      size: number; phase: number;
    }[] = [];

    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const j = 0.94 + Math.random() * 0.12; // shell thickness
      const x = Math.cos(theta) * r * j;
      const z = Math.sin(theta) * r * j;
      particles.push({
        x, y, z,
        tx: (Math.random() - 0.5) * 0.06,
        ty: (Math.random() - 0.5) * 0.06,
        tz: (Math.random() - 0.5) * 0.06,
        size: Math.random() * 1.4 + 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Precompute neighbor pairs for lines (points close on the sphere)
    const pairs: [number, number][] = [];
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dz = particles[i].z - particles[j].z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 0.028) pairs.push([i, j]);
      }
    }

    /* ---------- Animation ---------- */
    let raf = 0;
    let t = 0;
    let rotY = 0;
    let rotX = 0;
    const rotSpeedByMode: Record<SphereMode, number> = {
      idle: 0.0022,
      listening: 0.004,
      command: 0.006,
      processing: 0.016,
      speaking: 0.005,
      alert: 0.01,
    };
    const colorByMode: Record<SphereMode, { r: number; g: number; b: number }> = {
      idle: { r: 90, g: 170, b: 255 },
      listening: { r: 120, g: 200, b: 255 },
      command: { r: 140, g: 220, b: 255 },
      processing: { r: 170, g: 140, b: 255 },
      speaking: { r: 110, g: 210, b: 255 },
      alert: { r: 255, g: 80, b: 90 },
    };

    const draw = () => {
      t += 1;
      const m = modeRef.current;
      const energy = energyRef.current;
      const speed = rotSpeedByMode[m];
      rotY += speed;
      rotX = Math.sin(t * 0.001) * 0.22;

      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.34;
      const breathe = 1 + Math.sin(t * 0.02) * 0.015;
      const modePulse =
        m === "processing" ? 1 + Math.sin(t * 0.11) * 0.05
        : m === "alert" ? 1 + Math.sin(t * 0.3) * 0.04
        : m === "command" ? 1 + energy * 0.16
        : m === "speaking" ? 1 + energy * 0.1
        : breathe;
      const R = baseR * breathe * modePulse;

      const jitterX = m === "alert" ? (Math.random() - 0.5) * 5 : 0;
      const jitterY = m === "alert" ? (Math.random() - 0.5) * 5 : 0;

      ctx.clearRect(0, 0, w, h);
      const col = colorByMode[m];
      const alphaBoost =
        m === "processing" ? 1.35 : m === "idle" ? 0.75 : m === "alert" ? 1.2 : 1;

      // Rotate + project every particle once
      const sinY = Math.sin(rotY), cosY = Math.cos(rotY);
      const sinX = Math.sin(rotX), cosX = Math.cos(rotX);
      const px = new Float32Array(COUNT);
      const py = new Float32Array(COUNT);
      const pz = new Float32Array(COUNT);
      const turb = m === "processing" ? 2.6 : m === "command" ? 1 + energy * 2 : 1;

      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        const turbX = p.tx * turb * Math.sin(t * 0.03 + p.phase);
        const turbY = p.ty * turb * Math.sin(t * 0.025 + p.phase);
        let x = p.x + turbX;
        let y = p.y + turbY;
        let z = p.z;

        // rotate Y then X
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const persp = 1 / (1.6 - z2 * 0.55);
        px[i] = cx + x1 * R * persp + jitterX;
        py[i] = cy + y1 * R * persp + jitterY;
        pz[i] = z2;
      }

      // Connections
      ctx.lineWidth = 0.55;
      for (let k = 0; k < pairs.length; k++) {
        const [a, b] = pairs[k];
        const zAvg = (pz[a] + pz[b]) / 2;
        const depth = (zAvg + 1) / 2; // 0 back, 1 front
        const lineAlpha = 0.03 + depth * 0.16 * alphaBoost;
        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${lineAlpha})`;
        ctx.beginPath();
        ctx.moveTo(px[a], py[a]);
        ctx.lineTo(px[b], py[b]);
        ctx.stroke();
      }

      // Points
      for (let i = 0; i < COUNT; i++) {
        const depth = (pz[i] + 1) / 2;
        const size = particles[i].size * (0.5 + depth * 0.9);
        const tw = 0.45 + 0.55 * Math.sin(t * 0.04 + particles[i].phase);
        const a = (0.12 + depth * 0.75) * tw * alphaBoost;
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${Math.min(1, a)})`;
        ctx.beginPath();
        ctx.arc(px[i], py[i], size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core glow
      const glowA = 0.05 + (m === "processing" ? 0.16 : m === "speaking" ? 0.1 + energy * 0.08 : 0.06);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.9);
      grad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${glowA})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
};

export default NeuralSphere;
