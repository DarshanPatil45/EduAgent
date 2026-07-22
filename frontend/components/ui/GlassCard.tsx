'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  tilt?: boolean;
  glow?: boolean;
  hoverEffect?: boolean;
}

export default function GlassCard({
  children,
  tilt = false,
  glow = false,
  hoverEffect = true,
  className = '',
  style = {},
  ...props
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 30 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    x.set(mouseX / width);
    y.set(mouseY / height);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseClass = glow ? 'glass-card-glow' : 'glass-card';
  const hoverClass = hoverEffect ? 'glass-hover' : '';
  const finalClass = `${baseClass} ${hoverClass} ${className}`.trim();

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...(tilt ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : {}),
        ...style
      }}
      className={finalClass}
      {...props}
    >
      {children}
    </motion.div>
  );
}
