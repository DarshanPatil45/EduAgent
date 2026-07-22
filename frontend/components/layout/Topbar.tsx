'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, LogOut, Brain } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { initials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PAGE_META: Record<string, { title: string; subtitle: string; color: string }> = {
  '/dashboard':  { title: 'Dashboard',   subtitle: 'Your AI workspace',        color: '#818CF8' },
  '/upload':     { title: 'Documents',   subtitle: 'Manage study materials',   color: '#22D3EE' },
  '/chat':       { title: 'AI Chat',     subtitle: 'Talk to your documents',   color: '#A78BFA' },
  '/notes':      { title: 'Notes',       subtitle: 'AI-generated summaries',   color: '#34D399' },
  '/flashcards': { title: 'Flashcards',  subtitle: 'Spaced-repetition review', color: '#67E8F9' },
  '/quiz':       { title: 'Quiz',        subtitle: 'Adaptive AI testing',      color: '#FCD34D' },
  '/progress':   { title: 'Progress',    subtitle: 'Track your mastery',       color: '#86EFAC' },
  '/graph':      { title: 'Knowledge',   subtitle: 'Concept relationships',    color: '#F9A8D4' },
};

export default function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const base = '/' + (pathname?.split('/')[1] ?? '');
  const meta = PAGE_META[base] ?? { title: 'EduAgent-360', subtitle: 'AI Learning', color: '#818CF8' };

  if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/register')) return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.1 }}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 52,
        background: 'rgba(6, 10, 22, 0.75)',
        backdropFilter: 'blur(48px) saturate(200%)',
        WebkitBackdropFilter: 'blur(48px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        width: 'calc(100% - 48px)',
        maxWidth: 1120,
      }}
    >
      {/* Left — Logo + Page label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <motion.div
          animate={{ boxShadow: ['0 0 10px rgba(79,70,229,0.3)', '0 0 20px rgba(99,102,241,0.5)', '0 0 10px rgba(79,70,229,0.3)'] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Brain size={16} color="white" />
        </motion.div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {meta.title}
            </span>
            <span style={{ fontSize: 12, color: '#475569' }}>·</span>
            <span style={{ fontSize: 12, color: '#475569' }}>{meta.subtitle}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right — Search + notifications + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Search */}
        <motion.div
          animate={{
            borderColor: searchFocused ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)',
            background: searchFocused ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
            boxShadow: searchFocused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', border: '1px solid', borderRadius: 12, cursor: 'text', minWidth: 150 }}
          onClick={() => {}}
          role="search"
        >
          <Search size={13} color="#475569" />
          <input
            placeholder="Search…"
            aria-label="Search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', width: '100%', fontFamily: 'inherit' }}
          />
          <kbd style={{ fontSize: 10, color: '#334155', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>⌘K</kbd>
        </motion.div>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-label="Notifications"
          style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', position: 'relative' }}
        >
          <Bell size={14} />
          <motion.span
            animate={{ scale: [1, 1.2, 1], boxShadow: ['0 0 6px #6366F1', '0 0 12px #6366F1', '0 0 6px #6366F1'] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ position: 'absolute', top: 9, right: 9, width: 5, height: 5, borderRadius: '50%', background: '#6366F1' }}
          />
        </motion.button>

        {/* Avatar + logout */}
        <div
          style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => setShowLogout(true)}
          onMouseLeave={() => setShowLogout(false)}
        >
          <motion.div
            whileHover={{ scale: 1.06 }}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: 'white',
              cursor: 'pointer', zIndex: 2,
              boxShadow: '0 0 16px rgba(79,70,229,0.4)',
              letterSpacing: '-0.02em',
            }}
          >
            {user ? initials(user.full_name) : '?'}
          </motion.div>

          <AnimatePresence>
            {showLogout && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                onClick={() => { logout(); router.push('/login'); }}
                style={{
                  position: 'absolute', right: '100%', marginRight: 8,
                  padding: '6px 14px', borderRadius: 12, whiteSpace: 'nowrap',
                  background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                  color: '#FB7185', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <LogOut size={12} /> Sign out
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
