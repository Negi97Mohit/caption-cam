import React, { useRef, useEffect } from "react";

// --- Types ---
export type AmbientEffect =
  | "none"
  | "snow"
  | "rain"
  | "fire"
  | "fire-border"
  | "fire-border-continuous"
  | "sparkles"
  | "neon-pulse"
  | "bokeh"
  | "dust";

interface AmbientEffectsOverlayProps {
  effect: AmbientEffect;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius?: number;
  alpha?: number;
  life?: number;
  maxLife?: number;
  color?: string;
}

// --- Helper ---
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// --- Component ---
export const AmbientEffectsOverlay: React.FC<AmbientEffectsOverlayProps> = ({
  effect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrame = useRef<number>();
  const canvasSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width;
      canvas.height = height;
      canvasSize.current = { width, height };
      particles.current = [];
    });
    resizeObserver.observe(canvas);

    // --- Particle Creation ---
    const createParticles = () => {
      const { width, height } = canvasSize.current;
      const targetCount = {
        snow: 150,
        rain: 200,
        fire: 150,
        "fire-border": 200,
        sparkles: 100,
        "neon-pulse": 60,
        bokeh: 100,
        dust: 120,
      }[effect];

      if (!targetCount || particles.current.length >= targetCount) return;

      for (let i = 0; i < targetCount - particles.current.length; i++) {
        if (effect === "snow") {
          particles.current.push({
            x: random(0, width),
            y: random(0, height),
            vx: random(-0.5, 0.5),
            vy: random(0.5, 2),
            radius: random(1, 4),
            alpha: random(0.3, 0.8),
          });
        } else if (effect === "rain") {
          particles.current.push({
            x: random(0, width),
            y: random(-height, 0),
            vx: 0,
            vy: random(8, 12),
            radius: 1,
          });
        } else if (effect === "fire") {
          particles.current.push({
            x: random(width / 2 - 100, width / 2 + 100),
            y: height,
            vx: random(-1, 1),
            vy: random(-1, -4),
            radius: random(10, 25),
            life: 0,
            maxLife: random(60, 120),
          });
        } else if (effect === "fire-border") {
          const edges = ["bottom", "top", "left", "right"];
          const edge = edges[Math.floor(random(0, edges.length))];
          let x = 0,
            y = 0,
            vx = 0,
            vy = 0;
          if (edge === "bottom") {
            x = random(0, width);
            y = height;
            vx = random(-0.5, 0.5);
            vy = random(-1, -4);
          } else if (edge === "top") {
            x = random(0, width);
            y = 0;
            vx = random(-0.5, 0.5);
            vy = random(1, 4);
          } else if (edge === "left") {
            x = 0;
            y = random(0, height);
            vx = random(1, 3);
            vy = random(-0.5, 0.5);
          } else {
            x = width;
            y = random(0, height);
            vx = random(-3, -1);
            vy = random(-0.5, 0.5);
          }
          particles.current.push({
            x,
            y,
            vx,
            vy,
            radius: random(8, 20),
            life: 0,
            maxLife: random(50, 100),
          });
        } else if (effect === "sparkles") {
          particles.current.push({
            x: random(0, width),
            y: random(0, height),
            vx: random(-0.5, 0.5),
            vy: random(-0.5, 0.5),
            radius: random(1, 3),
            life: 0,
            maxLife: random(40, 80),
            color: `hsl(${random(40, 60)}, 100%, ${random(60, 80)}%)`,
          });
        } else if (effect === "neon-pulse") {
          particles.current.push({
            x: random(0, width),
            y: random(0, height),
            radius: random(20, 100),
            life: 0,
            maxLife: random(80, 150),
            color: `hsl(${random(200, 260)}, 100%, 50%)`,
          });
        } else if (effect === "bokeh") {
          particles.current.push({
            x: random(0, width),
            y: random(0, height),
            vx: random(-0.2, 0.2),
            vy: random(-0.2, 0.2),
            radius: random(10, 30),
            alpha: random(0.1, 0.3),
          });
        } else if (effect === "dust") {
          particles.current.push({
            x: random(0, width),
            y: random(0, height),
            vx: random(-0.1, 0.1),
            vy: random(-0.1, 0.1),
            radius: random(1, 3),
            alpha: random(0.1, 0.5),
          });
        }
      }
    };

    // --- Draw + Animate ---
    const updateAndDraw = () => {
      const { width, height } = canvasSize.current;
      ctx.clearRect(0, 0, width, height);
      createParticles();

      particles.current.forEach((p, i) => {
        p.x += p.vx || 0;
        p.y += p.vy || 0;

        // effect-wise drawing
        if (effect === "snow" && p.radius) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.fill();
          if (p.y > height) p.y = -10;
        } else if (effect === "rain") {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + 10);
          ctx.strokeStyle = "rgba(180,200,255,0.4)";
          ctx.stroke();
          if (p.y > height) p.y = -10;
        } else if ((effect === "fire" || effect === "fire-border") && p.radius) {
          const lifeRatio = (p.life || 0) / (p.maxLife || 1);
          p.life = (p.life || 0) + 1;
          p.radius *= 0.98;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, `rgba(255,200,0,${1 - lifeRatio})`);
          grad.addColorStop(1, "rgba(255,0,0,0)");
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          if (p.life > (p.maxLife || 0)) p.life = 0;
        } else if (effect === "sparkles") {
          p.life = (p.life || 0) + 1;
          const alpha = Math.sin((p.life / (p.maxLife || 1)) * Math.PI);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,200,${alpha})`;
          ctx.fill();
          if (p.life > (p.maxLife || 0)) p.life = 0;
        } else if (effect === "neon-pulse" && p.radius) {
          p.life = (p.life || 0) + 1;
          const alpha = Math.sin((p.life / (p.maxLife || 1)) * Math.PI);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,255,255,${alpha})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (effect === "bokeh" && p.radius) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.fill();
        } else if (effect === "dust") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,100,${p.alpha})`;
          ctx.fill();
        }
      });

      animationFrame.current = requestAnimationFrame(updateAndDraw);
    };

    if (effect !== "none") {
      updateAndDraw();
    }

    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      resizeObserver.disconnect();
    };
  }, [effect]);

  if (effect === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

// --- AI Prompt → Effect Mapper ---
export const mapPromptToEffect = (prompt: string): AmbientEffect => {
  const text = prompt.toLowerCase();
  if (text.includes("snow")) return "snow";
  if (text.includes("rain")) return "rain";
  if (text.includes("fire border")) return "fire-border";
  if (text.includes("fire")) return "fire";
  if (text.includes("sparkle") || text.includes("glitter")) return "sparkles";
  if (text.includes("neon")) return "neon-pulse";
  if (text.includes("bokeh")) return "bokeh";
  if (text.includes("dust") || text.includes("fog")) return "dust";
  if (text.includes("none") || text.includes("remove") || text.includes("stop") || text.includes("clear")) return "none";
  return "none";
};