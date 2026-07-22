'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import {
  Brain, LayoutDashboard, Upload, MessageSquare,
  FileText, Layers, HelpCircle, TrendingUp, GitBranch
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#818CF8' },
  { href: '/upload', label: 'Documents', icon: Upload, color: '#22D3EE' },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare, color: '#A78BFA' },
  { href: '/notes', label: 'Notes', icon: FileText, color: '#34D399' },
  { href: '/flashcards', label: 'Flashcards', icon: Layers, color: '#67E8F9' },
  { href: '/quiz', label: 'Quiz', icon: HelpCircle, color: '#FCD34D' },
  { href: '/progress', label: 'Progress', icon: TrendingUp, color: '#86EFAC' },
  { href: '/graph', label: 'Graph', icon: GitBranch, color: '#F9A8D4' },
];

function DockItem({
  item, isActive, mouseX,
}: {
  item: typeof NAV_ITEMS[0];
  isActive: boolean;
  mouseX: ReturnType<typeof useMotionValue<number>>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  const distance = useTransform(mouseX, (val) => {
    const el = ref.current;
    if (!el) return 9999;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return Math.abs(val - center);
  });

  const scale = useSpring(
    useTransform(distance, [0, 80, 140], [1.45, 1.15, 1.0]),
    { stiffness: 320, damping: 28, mass: 0.6 }
  );

  const y = useSpring(
    useTransform(distance, [0, 80, 140], [-12, -4, 0]),
    { stiffness: 320, damping: 28, mass: 0.6 }
  );

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              position: 'absolute',
              bottom: '110%',
              marginBottom: 8,
              background: 'rgba(8, 14, 28, 0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '5px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: 'white',
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              zIndex: 100,
              backdropFilter: 'blur(16px)',
            }}
          >
            {item.label}
            <div style={{
              position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
              width: 8, height: 8, background: 'rgba(8, 14, 28, 0.95)',
              borderRight: '1px solid rgba(255,255,255,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)',
              rotate: '45deg',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      <Link href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
        <motion.div
          animate={{
            background: isActive
              ? `${item.color}18`
              : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
            borderColor: isActive
              ? `${item.color}50`
              : hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
            boxShadow: isActive
              ? `0 0 20px ${item.color}30, inset 0 1px 0 rgba(255,255,255,0.1)`
              : hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          whileTap={{ scale: 0.9 }}
          role="button"
          aria-label={item.label}
          aria-current={isActive ? 'page' : undefined}
          style={{
            scale,
            y,
            width: 46,
            height: 46,
            borderRadius: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            cursor: 'pointer',
            transformOrigin: 'bottom center',
          }}
        >
          <Icon
            size={19}
            color={isActive ? item.color : hovered ? '#E2E8F0' : '#64748B'}
            style={{ transition: 'color 0.2s' }}
          />
        </motion.div>
      </Link>

      {/* Active dot indicator */}
      {isActive && (
        <motion.div
          layoutId="dock-indicator"
          style={{
            position: 'absolute',
            bottom: -8,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: item.color,
            boxShadow: `0 0 8px ${item.color}`,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </div>
  );
}

export default function FloatingDock() {
  const pathname = usePathname();
  const mouseX = useMotionValue(-1000);

  if (!pathname || pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/register')) return null;

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32, delay: 0.2 }}
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
      aria-label="Main navigation"
    >
      <motion.div
        className="dock-container"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(-1000)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '10px 14px',
        }}
      >
        {/* Logo */}
        <div style={{ paddingRight: 12, marginRight: 8, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center' }}>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 8 }}
            whileTap={{ scale: 0.92 }}
            animate={{ boxShadow: ['0 0 20px rgba(79,70,229,0.4)', '0 0 35px rgba(99,102,241,0.6)', '0 0 20px rgba(79,70,229,0.4)'] }}
            transition={{ boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }, scale: { type: 'spring', stiffness: 400, damping: 20 } }}
            style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Brain size={20} color="white" />
          </motion.div>
        </div>

        {NAV_ITEMS.map((item) => (
          <DockItem
            key={item.href}
            item={item}
            isActive={pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'))}
            mouseX={mouseX}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
