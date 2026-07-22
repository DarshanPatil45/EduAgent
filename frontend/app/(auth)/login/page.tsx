'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

function FloatingInput({
  label, type = 'text', value, onChange, error, icon: Icon,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; error?: string; icon: React.ElementType;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const actualType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        position: 'relative', borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${error ? '#F43F5E44' : focused ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
        background: 'rgba(255,255,255,0.03)',
        boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
        transition: 'all 0.2s',
      }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? '#818CF8' : '#64748B', transition: 'color 0.2s' }}>
          <Icon size={16} />
        </div>
        <input
          type={actualType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={label}
          aria-label={label}
          style={{
            width: '100%', padding: '14px 44px 14px 44px',
            background: 'transparent', border: 'none', outline: 'none',
            color: '#E2E8F0', fontSize: 14,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#64748B',
              display: 'flex', padding: 2,
            }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#F43F5E', fontSize: 12 }}
        >
          <AlertCircle size={12} /> {error}
        </motion.div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      login(data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <motion.div
          className="animate-float"
          style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(79,70,229,0.5)',
          }}
        >
          <Brain size={26} color="white" />
        </motion.div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#E2E8F0', marginBottom: 6, letterSpacing: '-0.02em' }}>
          Welcome back
        </h1>
        <p style={{ color: '#64748B', fontSize: 14 }}>Sign in to your EduAgent account</p>
      </div>

      {/* Card */}
      <div style={{
        padding: 32, borderRadius: 24,
        background: 'rgba(13,17,23,0.85)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 20,
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
              color: '#F43F5E', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FloatingInput label="Email address" type="email" value={email} onChange={setEmail} icon={Mail} />
          <FloatingInput label="Password" type="password" value={password} onChange={setPassword} icon={Lock} />

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -1 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '14px', marginTop: 8, borderRadius: 12,
              background: loading ? 'rgba(79,70,229,0.5)' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              border: 'none', color: 'white', fontWeight: 600, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 8px 24px rgba(79,70,229,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite', display: 'inline-block' }} />
                Signing in…
              </span>
            ) : (
              <>Sign in <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748B' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#818CF8', fontWeight: 600, textDecoration: 'none' }}>
            Sign up free
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
