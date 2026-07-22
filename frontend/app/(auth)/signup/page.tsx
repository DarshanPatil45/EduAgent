'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Check } from 'lucide-react';
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
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        position: 'relative', borderRadius: 12,
        border: `1px solid ${error ? '#F43F5E44' : focused ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
        background: 'rgba(255,255,255,0.03)',
        boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
        transition: 'all 0.2s',
      }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? '#818CF8' : '#64748B', transition: 'color 0.2s' }}>
          <Icon size={16} />
        </div>
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={label}
          aria-label={label}
          style={{ width: '100%', padding: '14px 44px', background: 'transparent', border: 'none', outline: 'none', color: '#E2E8F0', fontSize: 14 }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide' : 'Show'} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#F43F5E', fontSize: 12 }}><AlertCircle size={12} />{error}</motion.div>}
    </div>
  );
}

const STRENGTHS = [
  { label: 'Uppercase', test: /[A-Z]/ },
  { label: 'Number',    test: /[0-9]/ },
  { label: '8+ chars',  test: /.{8,}/ },
];

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (fullName.length < 2) return setError('Full name must be at least 2 characters.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      const data = await authApi.signup({ email, full_name: fullName, password });
      login(data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Sign up failed.';
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
          Create your account
        </h1>
        <p style={{ color: '#64748B', fontSize: 14 }}>Start your AI-powered learning journey</p>
      </div>

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
            style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#F43F5E', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FloatingInput label="Full name" value={fullName} onChange={setFullName} icon={User} />
          <FloatingInput label="Email address" type="email" value={email} onChange={setEmail} icon={Mail} />
          <FloatingInput label="Password" type="password" value={password} onChange={setPassword} icon={Lock} />

          {/* Password strength */}
          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}
            >
              {STRENGTHS.map(({ label, test }) => {
                const ok = test.test(password);
                return (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: ok ? '#10B981' : '#64748B',
                    padding: '3px 8px', borderRadius: 6,
                    background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.2s',
                  }}>
                    {ok && <Check size={10} />} {label}
                  </div>
                );
              })}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -1 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: loading ? 'rgba(79,70,229,0.5)' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              border: 'none', color: 'white', fontWeight: 600, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 8px 24px rgba(79,70,229,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading
              ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite', display: 'inline-block' }} />Creating account…</>
              : <>Create account <ArrowRight size={16} /></>}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748B' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#818CF8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </motion.div>
  );
}
