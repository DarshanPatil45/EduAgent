'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  speed: number;
  twinkle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PARTICLE_COLORS = [
      'rgba(99, 102, 241, ',
      'rgba(6, 182, 212, ',
      'rgba(124, 58, 237, ',
      'rgba(30, 144, 255, ',
    ];

    function initStars(W: number, H: number) {
      starsRef.current = Array.from({ length: 140 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 0.015 + 0.005,
        twinkle: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      if (!canvas) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      initStars(W, H);
    }

    resize();
    window.addEventListener('resize', resize);

    // Periodically emit particles
    const particleInterval = setInterval(() => {
      const W = canvas.width;
      const H = canvas.height;
      for (let i = 0; i < 2; i++) {
        const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        particlesRef.current.push({
          x: Math.random() * W,
          y: H + 10,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(Math.random() * 0.5 + 0.2),
          life: 0,
          maxLife: Math.random() * 200 + 100,
          r: Math.random() * 1.5 + 0.5,
          color,
        });
      }
    }, 600);

    function draw(t: number) {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Stars
      starsRef.current.forEach((star, i) => {
        star.twinkle += star.speed;
        const alpha = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
        ctx.fill();
      });

      // Floating particles
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const progress = p.life / p.maxLife;
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (alpha * 0.5) + ')';
        ctx.fill();
      });
    }

    function loop(t: number) {
      draw(t);
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(particleInterval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <div className="aurora-bg" aria-hidden />
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.8,
        }}
      />
    </>
  );
}
