'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';
import Topbar from '@/components/layout/Topbar';
import FloatingDock from '@/components/layout/FloatingDock';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated && !pathname?.startsWith('/login') && !pathname?.startsWith('/signup') && !pathname?.startsWith('/register')) {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, router, pathname]);

  if (!mounted) return null;

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/register');

  if (isAuthPage) {
    return (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <AuroraBackground />
        <CursorGlow />
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Global ambient background — each page adds its own AuroraBackground for page-specific control */}
      <AuroraBackground />
      <CursorGlow />

      <motion.div
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}
      >
        <Topbar />

        <main style={{ flex: 1, paddingTop: 88, paddingBottom: 100, minHeight: '100vh' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      <FloatingDock />
    </div>
  );
}
