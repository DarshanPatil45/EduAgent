'use client';

import { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -300, y: -300 });
  const currentPos = useRef({ x: -300, y: -300 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      posRef.current = { x: e.clientX, y: e.clientY };
    }

    function animate() {
      const ease = 0.08;
      currentPos.current.x += (posRef.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (posRef.current.y - currentPos.current.y) * ease;
      if (glowRef.current) {
        glowRef.current.style.left = `${currentPos.current.x}px`;
        glowRef.current.style.top = `${currentPos.current.y}px`;
      }
      rafRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', onMove);
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="cursor-glow"
      style={{ position: 'fixed', zIndex: 1, pointerEvents: 'none' }}
    />
  );
}
