'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Brain, Layers, MessageSquare, Target, ChevronRight } from 'lucide-react';
import { progressApi, quizApi } from '@/lib/api';
import type { ProgressSummary, QuizHistoryItem } from '@/lib/types';
import { formatDate, getScoreColor, getDifficultyColor } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';
import GlassCard from '@/components/ui/GlassCard';

function StatCard({ icon: Icon, label, value, color, delay }: { icon: React.ElementType; label: string; value: string | number; color: string; delay: number }) {
  return (
    <GlassCard
      style={{
        padding: 26, flex: 1, minWidth: 180,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 0% 0%, ${color}12, transparent 65%)`, pointerEvents: 'none' }} />
      
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.04em' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: 500 }}>{label}</div>
    </GlassCard>
  );
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([progressApi.summary(), quizApi.history()])
      .then(([p, h]) => { setProgress(p); setHistory(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const weakChartData = (progress?.weak_concepts ?? []).map((wc) => ({
    name: wc.concept.length > 28 ? wc.concept.slice(0, 28) + '…' : wc.concept,
    count: wc.count,
  }));

  const completedQuizzes = history.filter((h) => h.status === 'completed');
  const avgScore = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((acc, h) => acc + h.score, 0) / completedQuizzes.length)
    : 0;

  const scoreOverTime = completedQuizzes.slice(-8).map((h, i) => ({
    name: `Q${i + 1}`,
    score: Math.round(h.score),
  }));

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } } as const;
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } } } as const;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 40px 140px', maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
          <div className="badge badge-indigo" style={{ marginBottom: 14 }}>
            <TrendingUp size={10} /> Progress AI
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 8 }}>
            Your Learning Analytics
          </h1>
          <p style={{ color: '#64748B', fontSize: 15 }}>
            Real-time insights of your strengths, weak concept tracking, and adaptive scores.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="show">
          
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 24 }}>
            <StatCard icon={Layers}       label="Total Flashcards"   value={loading ? '…' : progress?.total_flashcards ?? 0} color="#67E8F9" delay={0.05} />
            <StatCard icon={MessageSquare}label="Chat Sessions"      value={loading ? '…' : progress?.total_sessions ?? 0}   color="#A78BFA" delay={0.1} />
            <StatCard icon={Target}       label="Quizzes Completed"  value={loading ? '…' : completedQuizzes.length}          color="#FCD34D" delay={0.15} />
            <StatCard icon={TrendingUp}   label="Avg Quiz Accuracy"  value={loading ? '…' : `${avgScore}%`}                  color="#34D399" delay={0.2} />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
            
            {/* Weak Concepts */}
            <motion.div variants={item}>
              <GlassCard style={{ padding: 28, height: '100%' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Brain size={15} color="#FB7185" /> Critical Concepts Need Focus
                </h2>
                {weakChartData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569', fontSize: 14 }}>
                    ✨ No focus areas detected yet! Complete some quizzes.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={weakChartData} layout="vertical" margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} width={120} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(8,14,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'var(--text)', fontSize: 12 }}
                        formatter={(v) => [v, 'Mistakes']}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="url(#weakGrad)" />
                      <defs>
                        <linearGradient id="weakGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#FB7185" />
                          <stop offset="100%" stopColor="#FB923C" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </GlassCard>
            </motion.div>

            {/* Score Trend */}
            <motion.div variants={item}>
              <GlassCard style={{ padding: 28, height: '100%' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={15} color="#34D399" /> Quiz Performance Trend
                </h2>
                {scoreOverTime.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569', fontSize: 14 }}>
                    Complete quiz sessions to build your accuracy trend.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={scoreOverTime} margin={{ left: -15, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(8,14,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'var(--text)', fontSize: 12 }}
                        formatter={(v) => [`${v}%`, 'Accuracy']}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="url(#scoreGrad)" />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818CF8" />
                          <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Weak Concepts List */}
          {progress && progress.weak_concepts && progress.weak_concepts.length > 0 && (
            <motion.div variants={item} style={{ marginBottom: 24 }}>
              <GlassCard style={{ padding: 28 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Brain size={15} color="#FB923C" /> All Focus Areas
                </h2>
                <p style={{ color: '#475569', fontSize: 13, marginBottom: 20 }}>A complete breakdown of concepts needing extra study. Click 'Ask AI' to explore any concept instantly.</p>

                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 6 }}>
                  {progress.weak_concepts.map((wc) => {
                    const status = wc.count <= 2 ? { label: 'Developing', color: '#FCD34D' } : wc.count <= 4 ? { label: 'Weak', color: '#FB923C' } : { label: 'Critical', color: '#FB7185' };
                    return (
                      <div
                        key={wc.concept}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', borderRadius: 14,
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%', background: status.color, boxShadow: `0 0 6px ${status.color}`, flexShrink: 0
                          }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {wc.concept}
                            </div>
                            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                              {wc.count} mistakes logged
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: `${status.color}15`, border: `1px solid ${status.color}35`, color: status.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {status.label}
                          </span>
                          <a
                            href={`/chat?q=${encodeURIComponent('Explain ' + wc.concept + ' in detail with examples')}`}
                            style={{
                              padding: '6px 14px', borderRadius: 10,
                              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                              color: '#818CF8', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            Ask AI <ChevronRight size={11} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* History */}
          <motion.div variants={item}>
            <GlassCard style={{ padding: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>Quiz History</h2>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: 14 }}>
                  No quiz sessions yet. <a href="/quiz" style={{ color: '#818CF8', textDecoration: 'none' }}>Take your first quiz →</a>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Date', 'Difficulty', 'Questions', 'Accuracy', 'Status'].map((th) => (
                          <th key={th} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{th}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={h.session_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px', fontSize: 13, color: '#94A3B8' }}>{formatDate(h.created_at)}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: `${getDifficultyColor(h.difficulty)}15`, border: `1px solid ${getDifficultyColor(h.difficulty)}30`, color: getDifficultyColor(h.difficulty), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {h.difficulty}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: 13, color: '#94A3B8' }}>{h.total_questions}</td>
                          <td style={{ padding: '12px', fontSize: 15, fontWeight: 800, color: h.status === 'completed' ? getScoreColor(h.score) : '#475569' }}>
                            {h.status === 'completed' ? `${Math.round(h.score)}%` : '—'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              fontSize: 10, padding: '3px 8px', borderRadius: 6,
                              background: h.status === 'completed' ? 'rgba(16,185,129,0.1)' : h.status === 'abandoned' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
                              border: `1px solid ${h.status === 'completed' ? 'rgba(16,185,129,0.3)' : h.status === 'abandoned' ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                              color: h.status === 'completed' ? '#34D399' : h.status === 'abandoned' ? '#FB7185' : '#FCD34D',
                              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                              {h.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
