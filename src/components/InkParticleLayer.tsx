import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type SplashTint = 'gold' | 'portalA' | 'portalB' | 'lotus';

export interface InkParticleHandle {
  emitSegmentSplash: (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    tint?: SplashTint
  ) => void;
  emitBrushDrag: (x: number, y: number, vx: number, vy: number) => void;
  emitUndoMist: (x: number, y: number) => void;
  emitVictoryCascade: (points: Array<{ x: number; y: number }>) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  stretch: number;
  angle: number;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  kind: 'ink' | 'gold' | 'mist';
  color: string;
}

interface InkParticleLayerProps {
  width: number;
  height: number;
}

const MAX_PARTICLES = 200;

export const InkParticleLayer = forwardRef<InkParticleHandle, InkParticleLayerProps>(
  function InkParticleLayer({ width, height }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const rafIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const sizeRef = useRef({ width, height });
    const reducedMotionRef = useRef(false);

    useEffect(() => {
      sizeRef.current = { width, height };
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }, [width, height]);

    useEffect(() => {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      reducedMotionRef.current = Boolean(mq?.matches);
      const onChange = (e: MediaQueryListEvent) => {
        reducedMotionRef.current = e.matches;
      };
      mq?.addEventListener?.('change', onChange);
      return () => {
        mq?.removeEventListener?.('change', onChange);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }, []);

    const startLoop = () => {
      if (rafIdRef.current !== null || reducedMotionRef.current) return;
      lastTimeRef.current = performance.now();

      const tick = (now: number) => {
        const rawDt = (now - lastTimeRef.current) / 1000;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
        lastTimeRef.current = now;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const list = particlesRef.current;

        if (!ctx || !canvas) {
          rafIdRef.current = null;
          return;
        }

        const { width: w, height: h } = sizeRef.current;
        ctx.clearRect(0, 0, w, h);

        let writeIdx = 0;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          p.life += dt;
          if (p.life >= p.maxLife) continue;

          // Smooth calligraphic brush deceleration
          const damping = Math.pow(p.drag, dt * 60);
          p.vx *= damping;
          p.vy *= damping;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          const progress = p.life / p.maxLife;
          // Gentle ease-in then paper-absorption fade-out
          const fade = progress < 0.14 ? progress / 0.14 : Math.pow(1 - (progress - 0.14) / 0.86, 1.5);
          const currentAlpha = p.alpha * fade;

          if (currentAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = currentAlpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);

            if (p.kind === 'ink') {
              // Organic elongated ink droplet (calligraphic splatter shape)
              const grow = 1 + progress * 0.25;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.ellipse(0, 0, p.radius * p.stretch * grow, p.radius * grow, 0, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.kind === 'gold') {
              // Luminous fine kintsugi gold dust fleck
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(0, 0, p.radius * (1 - progress * 0.35), 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Soft radial ink wash halo
              const r = p.radius * (1 + progress * 0.9);
              const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
              grad.addColorStop(0, p.color);
              grad.addColorStop(1, 'rgba(13, 24, 27, 0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(0, 0, r, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }

          list[writeIdx++] = p;
        }
        list.length = writeIdx;

        if (list.length > 0) {
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, w, h);
          rafIdRef.current = null;
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    };

    const pushParticle = (p: Particle) => {
      if (reducedMotionRef.current) return;
      const list = particlesRef.current;
      if (list.length >= MAX_PARTICLES) {
        list.shift();
      }
      list.push(p);
      startLoop();
    };

    useImperativeHandle(ref, () => ({
      emitSegmentSplash(fromX, fromY, toX, toY, tint = 'gold') {
        if (reducedMotionRef.current) return;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.hypot(dx, dy) || 1;
        const dirX = dx / dist;
        const dirY = dy / dist;
        const perpX = -dirY;
        const perpY = dirX;
        const baseAngle = Math.atan2(dy, dx);

        const accentPalette =
          tint === 'portalA'
            ? ['#7be3ef', '#c4f5fb', '#f3d482']
            : tint === 'portalB'
            ? ['#d9a8f5', '#f0dcff', '#f3d482']
            : tint === 'lotus'
            ? ['#72dec0', '#f6df9e', '#d8fff0']
            : ['#e9c46a', '#f6df9e', '#d49d3b'];

        const inkPalette = ['#0d181b', '#17292d', '#243d42'];

        // 1. Faint calligraphic sumi-ink splatter droplets scattered along the stroke segment
        const inkCount = 8;
        for (let i = 0; i < inkCount; i++) {
          const t = 0.2 + Math.random() * 0.85;
          const side = (Math.random() - 0.5) * 2;
          const offset = side * (3 + Math.random() * 6);
          const x = fromX + dx * t + perpX * offset;
          const y = fromY + dy * t + perpY * offset;

          const forwardSpeed = 14 + Math.random() * 34;
          const lateralSpeed = side * (16 + Math.random() * 32);

          pushParticle({
            x,
            y,
            vx: dirX * forwardSpeed + perpX * lateralSpeed,
            vy: dirY * forwardSpeed + perpY * lateralSpeed,
            radius: 1.4 + Math.random() * 2.4,
            stretch: 1.15 + Math.random() * 0.85,
            angle: baseAngle + (Math.random() - 0.5) * 0.9,
            alpha: 0.34 + Math.random() * 0.24,
            life: 0,
            maxLife: 0.38 + Math.random() * 0.28,
            drag: 0.88,
            kind: 'ink',
            color: inkPalette[i % inkPalette.length],
          });
        }

        // 2. Delicate warm gold lacquer flecks trailing off the brush tip
        const goldCount = 6;
        for (let i = 0; i < goldCount; i++) {
          const t = 0.35 + Math.random() * 0.7;
          const side = (Math.random() - 0.5) * 2;
          const x = fromX + dx * t + perpX * side * (2 + Math.random() * 5);
          const y = fromY + dy * t + perpY * side * (2 + Math.random() * 5);

          const speed = 18 + Math.random() * 40;
          const spreadAngle = baseAngle + (Math.random() - 0.5) * 1.4;

          pushParticle({
            x,
            y,
            vx: Math.cos(spreadAngle) * speed,
            vy: Math.sin(spreadAngle) * speed,
            radius: 1.0 + Math.random() * 1.6,
            stretch: 1,
            angle: 0,
            alpha: 0.45 + Math.random() * 0.32,
            life: 0,
            maxLife: 0.36 + Math.random() * 0.3,
            drag: 0.91,
            kind: 'gold',
            color: accentPalette[i % accentPalette.length],
          });
        }

        // 3. Soft ink-wash bloom settling at the landing tile center
        pushParticle({
          x: toX,
          y: toY,
          vx: dirX * 5,
          vy: dirY * 5,
          radius: 7 + Math.random() * 4,
          stretch: 1,
          angle: 0,
          alpha: 0.28,
          life: 0,
          maxLife: 0.42,
          drag: 0.92,
          kind: 'mist',
          color: tint === 'gold' ? 'rgba(217, 167, 74, 0.32)' : 'rgba(107, 216, 230, 0.34)',
        });
      },

      emitBrushDrag(x, y, vx, vy) {
        if (reducedMotionRef.current) return;
        const speed = Math.hypot(vx, vy);
        const angle = Math.atan2(vy, vx);
        const count = speed > 180 ? 3 : 2;

        for (let i = 0; i < count; i++) {
          const isInk = i % 2 === 0;
          const jitterAngle = angle + Math.PI + (Math.random() - 0.5) * 1.8;
          const ejectSpeed = 8 + Math.random() * Math.min(28, speed * 0.14);

          pushParticle({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: Math.cos(jitterAngle) * ejectSpeed,
            vy: Math.sin(jitterAngle) * ejectSpeed,
            radius: isInk ? 1.2 + Math.random() * 1.8 : 0.9 + Math.random() * 1.2,
            stretch: isInk ? 1.3 + Math.random() * 0.5 : 1,
            angle: jitterAngle,
            alpha: isInk ? 0.28 + Math.random() * 0.18 : 0.4 + Math.random() * 0.25,
            life: 0,
            maxLife: 0.3 + Math.random() * 0.22,
            drag: 0.89,
            kind: isInk ? 'ink' : 'gold',
            color: isInk ? '#122226' : '#f1cf7a',
          });
        }
      },

      emitUndoMist(x, y) {
        if (reducedMotionRef.current) return;
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
          const spd = 12 + Math.random() * 18;
          pushParticle({
            x,
            y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            radius: 1.2 + Math.random() * 1.2,
            stretch: 1,
            angle: a,
            alpha: 0.32,
            life: 0,
            maxLife: 0.28 + Math.random() * 0.16,
            drag: 0.88,
            kind: 'gold',
            color: '#c4d3cf',
          });
        }
      },

      emitVictoryCascade(points) {
        if (reducedMotionRef.current || points.length === 0) return;
        const step = Math.max(1, Math.floor(points.length / 18));
        for (let i = 0; i < points.length; i += step) {
          const pt = points[i];
          for (let j = 0; j < 4; j++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 20 + Math.random() * 48;
            pushParticle({
              x: pt.x,
              y: pt.y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd - 8,
              radius: 1.2 + Math.random() * 1.9,
              stretch: 1.2,
              angle: a,
              alpha: 0.58 + Math.random() * 0.28,
              life: 0,
              maxLife: 0.55 + Math.random() * 0.35,
              drag: 0.93,
              kind: j === 0 ? 'ink' : 'gold',
              color: j === 0 ? '#182c30' : j % 2 === 0 ? '#f6df9e' : '#e9c46a',
            });
          }
        }
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="pointer-events-none absolute inset-0 z-20"
        aria-hidden="true"
      />
    );
  }
);
