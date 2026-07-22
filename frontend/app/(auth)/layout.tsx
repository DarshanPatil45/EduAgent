'use client';

import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <AuroraBackground />
      <CursorGlow />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: '0 20px' }}>
        {children}
      </div>
    </div>
  );
}
