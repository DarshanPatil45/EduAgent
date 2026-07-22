'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Layers, HelpCircle, FileText, Upload,
  Brain, Zap, BookOpen, Clock, Activity, GitBranch,
  TrendingUp, Flame, Target, ChevronRight, Sparkles
} from 'lucide-react';
import { documentsApi, progressApi, flashcardsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatRelativeTime, truncate } from '@/lib/utils';
import type { DocumentResponse, ProgressSummary } from '@/lib/types';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

/* ─── Progress Ring ──────────────────────────────────────────────────────────── */
function ProgressRing({ value, max, size = 120, color = '#6366F1', label }: { value: number; max: number; size?: number; color?: string; label: string }) {
  const radius = (size - 16) / 2;
  const circ = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(progress), 200);
    return () => clearTimeout(t);
  }, [progress]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - animated)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>{Math.round(animated * 100)}<span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>%</span></span>
        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
    </div>
  );
}

/* ─── Study Heatmap ──────────────────────────────────────────────────────────── */
function StudyHeatmap() {
  const weeks = 18;
  const days = 7;
  // Generate mock data seeded to look realistic
  const data = Array.from({ length: weeks * days }, (_, i) => {
    const seed = Math.sin(i * 1.7 + 13) * 0.5 + 0.5;
    if (seed < 0.4) return 0;
    if (seed < 0.6) return 1;
    if (seed < 0.8) return 2;
    if (seed < 0.92) return 3;
    return 4;
  });
  const colors = ['rgba(255,255,255,0.04)', 'rgba(99,102,241,0.25)', 'rgba(99,102,241,0.45)', 'rgba(99,102,241,0.70)', 'rgba(99,102,241,1)'];
  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 20 }}>
        {DAYS.map((d, i) => <div key={`${d}-${i}`} style={{ width: 12, height: 10, fontSize: 9, color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{d}</div>)}
      </div>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks}, 12px)`, gridTemplateRows: `repeat(${days}, 12px)`, gap: 3 }}>
          {data.map((val, i) => (
            <motion.div
              key={i}
              className="heatmap-cell"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.003, duration: 0.3 }}
              title={`${val} sessions`}
              style={{ width: 10, height: 10, background: colors[val], borderRadius: 2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Action ───────────────────────────────────────────────────────────── */
function QuickAction({ href, icon: Icon, label, desc, color, badge }: {
  href: string; icon: typeof MessageSquare; label: string; desc: string; color: string; badge?: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <motion.div
        whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        whileTap={{ scale: 0.97 }}
        style={{
          padding: 24, borderRadius: 24,
          background: 'rgba(10,22,40,0.55)',
          border: `1px solid rgba(255,255,255,0.07)`,
          backdropFilter: 'blur(32px)',
          cursor: 'pointer', height: '100%',
          position: 'relative', overflow: 'hidden',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}
        onHoverStart={e => {
          (e.target as HTMLElement).style?.setProperty?.('border-color', `${color}35`);
          (e.target as HTMLElement).style?.setProperty?.('box-shadow', `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`);
        }}
        onHoverEnd={e => {
          (e.target as HTMLElement).style?.setProperty?.('border-color', 'rgba(255,255,255,0.07)');
          (e.target as HTMLElement).style?.setProperty?.('box-shadow', 'none');
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 0% 0%, ${color}10, transparent 60%)`, pointerEvents: 'none' }} />
        {badge && (
          <div style={{ position: 'absolute', top: 14, right: 14, padding: '3px 8px', borderRadius: 20, background: `${color}20`, border: `1px solid ${color}40`, color, fontSize: 10, fontWeight: 800 }}>
            {badge}
          </div>
        )}
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon size={20} color={color} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{label}</h3>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{desc}</p>
      </motion.div>
    </Link>
  );
}

/* ─── Stat Chip ──────────────────────────────────────────────────────────────── */
function StatChip({ icon: Icon, value, label, color }: { icon: typeof Activity; value: string | number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Mini Knowledge Graph ───────────────────────────────────────────────────── */
function MiniGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = [
      { x: 50, y: 50, r: 8, color: '99,102,241' },
      { x: 20, y: 25, r: 5, color: '6,182,212' },
      { x: 80, y: 22, r: 6, color: '124,58,237' },
      { x: 15, y: 72, r: 5, color: '6,182,212' },
      { x: 85, y: 75, r: 5, color: '16,185,129' },
      { x: 50, y: 8, r: 4, color: '245,158,11' },
      { x: 30, y: 85, r: 4, color: '16,185,129' },
      { x: 70, y: 85, r: 4, color: '124,58,237' },
    ];
    const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 3], [2, 4], [5, 2], [6, 3], [7, 4]];

    function draw(t: number) {
      if (!canvas || !ctx) return;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      const animated = nodes.map((n, i) => ({
        x: (n.x / 100) * W + Math.sin(t * 0.001 + i) * 5,
        y: (n.y / 100) * H + Math.cos(t * 0.0013 + i * 0.7) * 5,
        r: n.r, color: n.color,
      }));

      edges.forEach(([a, b]) => {
        const pulse = (Math.sin(t * 0.002 + a) + 1) / 2;
        ctx.beginPath();
        ctx.moveTo(animated[a].x, animated[a].y);
        ctx.lineTo(animated[b].x, animated[b].y);
        ctx.strokeStyle = `rgba(99,102,241,${0.1 + pulse * 0.15})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animated.forEach((n, i) => {
        const pulse = (Math.sin(t * 0.0015 + i * 0.5) + 1) / 2;
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
        grd.addColorStop(0, `rgba(${n.color},${0.4 + pulse * 0.3})`);
        grd.addColorStop(1, `rgba(${n.color},0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (0.8 + pulse * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.color},${0.6 + pulse * 0.4})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} aria-hidden />;
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [d, p, due] = await Promise.all([
          documentsApi.list(),
          progressApi.summary(),
          flashcardsApi.due(),
        ]);
        setDocs(d.slice(0, 5));
        setProgress(p);
        setDueCount(due.length);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Late night grind' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } } as const;
  const item = { hidden: { opacity: 0, y: 20, filter: 'blur(8px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 260, damping: 22 } } } as const;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px 40px 120px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Greeting ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '40px 0 48px', position: 'relative' }}
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 300, background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: -1 }}
          />
          <div className="badge badge-indigo" style={{ marginBottom: 16 }}>
            <Sparkles size={11} /> AI Workspace
          </div>
          <h1 style={{ fontSize: 'clamp(36px,5vw,56px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {greeting},<br />
            <span className="gradient-text-indigo">{firstName}.</span>
          </h1>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 440, margin: '14px auto 0', lineHeight: 1.65 }}>
            Your AI workspace is ready. Continue where you left off, or start something new.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="show">

          {/* ── Row 1: Streak + Ring + Mini Graph ─────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* Study Streak */}
            <motion.div variants={item} className="glass-card" style={{ padding: 28, gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flame size={15} color="#FB7185" /> Study Streak
                </h2>
                <span className="badge badge-rose">🔥 Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 60, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
                  <span className="gradient-text-indigo">{loading ? '—' : (progress?.total_sessions ?? 0)}</span>
                </span>
                <span style={{ fontSize: 14, color: '#64748B', paddingBottom: 8 }}>sessions</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < (loading ? 0 : Math.min(progress?.total_sessions ?? 0, 7)) ? 'linear-gradient(90deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.06)' }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>Last 7 days activity</p>
            </motion.div>

            {/* Progress Ring */}
            <motion.div variants={item} className="glass-card" style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 24 }}>
              <ProgressRing
                value={loading ? 0 : progress?.total_flashcards ?? 0}
                max={loading ? 1 : Math.max(progress?.total_flashcards ?? 0, 1) + 20}
                color="#22D3EE" label="Mastery"
              />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <Activity size={15} color="#22D3EE" /> Progress
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <StatChip icon={Layers} value={loading ? '…' : progress?.total_flashcards ?? 0} label="Flashcards" color="#67E8F9" />
                  <StatChip icon={MessageSquare} value={loading ? '…' : progress?.total_sessions ?? 0} label="Chat sessions" color="#A78BFA" />
                </div>
              </div>
            </motion.div>

            {/* Mini Knowledge Graph */}
            <motion.div variants={item} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GitBranch size={15} color="#F9A8D4" /> Knowledge Graph
                </h2>
                <Link href="/graph" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#818CF8', textDecoration: 'none' }}>
                  Explore <ChevronRight size={12} />
                </Link>
              </div>
              <div style={{ height: 160 }}>
                <MiniGraph />
              </div>
            </motion.div>
          </div>

          {/* ── Row 2: Quick Actions (6 cols) + Recent Docs (4 cols) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* Quick Actions */}
            <motion.div variants={item}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color="#FCD34D" /> Quick Actions
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <QuickAction href="/chat" icon={MessageSquare} label="AI Chat" color="#818CF8" desc="Ask your documents anything" />
                <QuickAction href="/upload" icon={Upload} label="Upload" color="#22D3EE" desc="Add new study material" />
                <QuickAction href="/quiz" icon={HelpCircle} label="Take Quiz" color="#FCD34D" desc="Adaptive AI questions" />
                <QuickAction href="/flashcards" icon={Layers} label="Flashcards" color="#34D399" desc="Spaced repetition review" badge={dueCount > 0 ? `${dueCount} due` : undefined} />
                <QuickAction href="/notes" icon={FileText} label="Notes" color="#A78BFA" desc="AI-generated summaries" />
                <QuickAction href="/progress" icon={TrendingUp} label="Progress" color="#86EFAC" desc="Track your mastery" />
              </div>
            </motion.div>

            {/* Recent Documents */}
            <motion.div variants={item} className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={15} color="#A78BFA" /> Recent Files
                </h2>
                <Link href="/upload" style={{ fontSize: 12, color: '#818CF8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  View all <ChevronRight size={11} />
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)
                ) : docs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#334155' }}>
                    <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p style={{ fontSize: 13 }}>No documents yet</p>
                    <Link href="/upload" style={{ fontSize: 12, color: '#818CF8', textDecoration: 'none' }}>Upload your first file →</Link>
                  </div>
                ) : docs.map((doc, i) => (
                  <Link key={doc.id} href={`/notes/${doc.id}`} style={{ textDecoration: 'none' }}>
                    <motion.div
                      whileHover={{ x: 3, background: 'rgba(255,255,255,0.05)' }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={15} color="#A78BFA" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truncate(doc.original_name, 28)}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{formatRelativeTime(doc.created_at)}</div>
                      </div>
                      <ChevronRight size={14} color="#334155" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Row 3: Heatmap + Upcoming + Weak concepts ─────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>

            {/* Heatmap */}
            <motion.div variants={item} className="glass-card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={15} color="#34D399" /> Study Activity
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {['Less', 'rgba(99,102,241,0.2)', 'rgba(99,102,241,0.5)', 'rgba(99,102,241,0.8)', '#6366F1', 'More'].map((v, i) =>
                    i === 0 || i === 5 ? <span key={i} style={{ fontSize: 10, color: '#334155' }}>{v}</span> :
                      <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: v }} />
                  )}
                </div>
              </div>
              <StudyHeatmap />
            </motion.div>

            {/* Upcoming Reviews + Weak Concepts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <motion.div variants={item} className="glass-card" style={{ padding: 22 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Clock size={15} color="#FCD34D" /> Upcoming Reviews
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: dueCount > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${dueCount > 0 ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: dueCount > 0 ? '#818CF8' : '#334155' }}>{loading ? '…' : dueCount}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{dueCount > 0 ? `${dueCount} cards due` : 'All caught up!'}</p>
                    <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{dueCount > 0 ? 'Tap to start review session' : 'No cards due today'}</p>
                    {dueCount > 0 && (
                      <Link href="/flashcards" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#818CF8', textDecoration: 'none', marginTop: 6, fontWeight: 600 }}>
                        Start reviewing <ChevronRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Weak Concepts */}
              <motion.div variants={item} className="glass-card" style={{ padding: 22, flex: 1 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Target size={15} color="#FB7185" /> Focus Areas
                </h2>
                {!loading && progress && progress.weak_concepts.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {progress.weak_concepts.slice(0, 5).map(wc => (
                      <Link key={wc.concept} href={`/chat?q=${encodeURIComponent('Explain ' + wc.concept)}`} style={{ textDecoration: 'none' }}>
                        <motion.div whileHover={{ scale: 1.05 }} style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', fontSize: 12, color: '#FB7185', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {truncate(wc.concept, 18)}
                          <span style={{ fontSize: 10, background: 'rgba(244,63,94,0.2)', padding: '1px 5px', borderRadius: 6 }}>{wc.count}×</span>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                    {loading ? 'Loading…' : '✨ No weak areas detected yet'}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
