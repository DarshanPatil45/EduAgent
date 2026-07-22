'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, Play, Loader2, Clock, CheckCircle,
  Target, Zap, Brain, Trophy, ChevronRight, Sparkles, FileText
} from 'lucide-react';
import { quizApi, documentsApi } from '@/lib/api';
import type { DocumentResponse, DifficultyLevel, QuestionType, QuizHistoryItem } from '@/lib/types';
import { formatDate, getDifficultyColor, getScoreColor } from '@/lib/utils';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

const DIFFICULTIES: { value: DifficultyLevel; label: string; desc: string; color: string; emoji: string }[] = [
  { value: 'easy',   label: 'Easy',   desc: 'Core concepts',   color: '#34D399', emoji: '🌱' },
  { value: 'medium', label: 'Medium', desc: 'Deeper recall',   color: '#FCD34D', emoji: '⚡' },
  { value: 'hard',   label: 'Hard',   desc: 'Edge cases',      color: '#FB7185', emoji: '🔥' },
  { value: 'mixed',  label: 'Mixed',  desc: 'Adaptive AI',     color: '#A78BFA', emoji: '🎲' },
];

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'mcq',          label: 'Multiple Choice', icon: '🔘' },
  { value: 'true_false',   label: 'True / False',   icon: '✅' },
  { value: 'fill_blank',   label: 'Fill in Blank',  icon: '📝' },
  { value: 'short_answer', label: 'Short Answer',   icon: '💬' },
];

/* ─── Score ring ─────────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#FCD34D' : '#FB7185';
  return (
    <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
      {Math.round(score)}%
    </div>
  );
}

export default function QuizStartPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('mixed');
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['mcq', 'true_false', 'fill_blank']);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([documentsApi.list(), quizApi.history()])
      .then(([d, h]) => { setDocs(d); setHistory(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleDoc(id: string) {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleType(t: QuestionType) {
    setQuestionTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function startQuiz() {
    if (selectedDocs.length === 0 || questionTypes.length === 0) return;
    setStarting(true);
    try {
      const session = await quizApi.start({ document_ids: selectedDocs, difficulty, question_types: questionTypes, total_questions: totalQuestions });
      router.push(`/quiz/${session.session_id}`);
    } catch { setStarting(false); }
  }

  const canStart = selectedDocs.length > 0 && questionTypes.length > 0 && !starting;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 40px 140px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
          <div className="badge badge-indigo" style={{ marginBottom: 14 }}>
            <Sparkles size={10} /> AI-Adaptive
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 8 }}>
            Adaptive Quiz
          </h1>
          <p style={{ color: '#64748B', fontSize: 15 }}>
            AI-generated questions tailored to your weak areas and selected difficulty.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left: Configuration ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Document Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="glass-card" style={{ padding: 24 }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <FileText size={14} color="#22D3EE" /> Select Documents
              </h3>
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 12 }} />)
              ) : docs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569' }}>
                  <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>No documents uploaded yet.</p>
                  <Link href="/upload" style={{ fontSize: 13, color: '#818CF8', textDecoration: 'none' }}>Upload a file →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {docs.map(d => (
                    <motion.div
                      key={d.id}
                      onClick={() => toggleDoc(d.id)}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        borderRadius: 14, cursor: 'pointer',
                        background: selectedDocs.includes(d.id) ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${selectedDocs.includes(d.id) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <motion.div
                        animate={{
                          background: selectedDocs.includes(d.id) ? '#6366F1' : 'transparent',
                          borderColor: selectedDocs.includes(d.id) ? '#6366F1' : 'rgba(255,255,255,0.2)',
                        }}
                        style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                      >
                        <AnimatePresence>
                          {selectedDocs.includes(d.id) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <CheckCircle size={12} color="white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <span style={{ fontSize: 13, color: selectedDocs.includes(d.id) ? '#C7D2FE' : '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {d.original_name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Difficulty */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="glass-card" style={{ padding: 24 }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Zap size={14} color="#FCD34D" /> Difficulty
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {DIFFICULTIES.map(d => (
                  <motion.button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '14px 12px', borderRadius: 14, cursor: 'pointer',
                      background: difficulty === d.value ? `${d.color}15` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${difficulty === d.value ? d.color + '50' : 'rgba(255,255,255,0.07)'}`,
                      fontFamily: 'inherit', textAlign: 'left',
                      boxShadow: difficulty === d.value ? `0 0 20px ${d.color}20` : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{d.emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: difficulty === d.value ? d.color : '#94A3B8' }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{d.desc}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Question Types */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-card" style={{ padding: 24 }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Brain size={14} color="#A78BFA" /> Question Types
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {QUESTION_TYPES.map(t => (
                  <motion.button
                    key={t.value}
                    onClick={() => toggleType(t.value)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      background: questionTypes.includes(t.value) ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${questionTypes.includes(t.value) ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <motion.div
                      animate={{
                        background: questionTypes.includes(t.value) ? '#6366F1' : 'transparent',
                        borderColor: questionTypes.includes(t.value) ? '#6366F1' : 'rgba(255,255,255,0.2)',
                      }}
                      style={{ width: 18, height: 18, borderRadius: 5, border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {questionTypes.includes(t.value) && <CheckCircle size={10} color="white" />}
                    </motion.div>
                    <span style={{ fontSize: 12, color: questionTypes.includes(t.value) ? '#C7D2FE' : '#64748B', fontWeight: 500 }}>
                      {t.icon} {t.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Count + Start */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
              className="glass-card" style={{ padding: 24 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={14} color="#34D399" /> Questions
                </h3>
                <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em' }}>
                  <span className="gradient-text-indigo">{totalQuestions}</span>
                </span>
              </div>
              <input
                type="range" min={5} max={50} step={5} value={totalQuestions}
                onChange={e => setTotalQuestions(Number(e.target.value))}
                aria-label="Number of questions"
                style={{ width: '100%', accentColor: '#6366F1', marginBottom: 20, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#334155', marginBottom: 20 }}>
                <span>5 min</span><span>~{Math.round(totalQuestions * 1.5)} min</span><span>25 min</span>
              </div>
              <motion.button
                onClick={startQuiz}
                disabled={!canStart}
                whileHover={{ scale: canStart ? 1.02 : 1, y: canStart ? -2 : 0 }}
                whileTap={{ scale: canStart ? 0.97 : 1 }}
                className={canStart ? 'btn-primary' : ''}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, border: 'none',
                  background: canStart ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.04)',
                  color: canStart ? 'white' : '#334155',
                  fontWeight: 800, fontSize: 15, cursor: canStart ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: canStart ? '0 8px 32px rgba(79,70,229,0.4)' : 'none',
                  fontFamily: 'inherit', transition: 'all 0.25s', letterSpacing: '-0.01em',
                }}
              >
                {starting
                  ? <><Loader2 size={18} className="animate-spin-slow" /> Generating quiz…</>
                  : <><Play size={18} /> Begin Quiz · {totalQuestions} questions</>}
              </motion.button>
              {selectedDocs.length === 0 && (
                <p style={{ fontSize: 12, color: '#334155', textAlign: 'center', marginTop: 10 }}>Select at least one document to begin</p>
              )}
            </motion.div>
          </div>

          {/* ── Right: History ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="glass-card" style={{ padding: 24, position: 'sticky', top: 80 }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Clock size={14} color="#FCD34D" /> Recent Sessions
            </h3>

            {loading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 10, borderRadius: 14 }} />)
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155' }}>
                <Target size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                <p style={{ fontSize: 14, color: '#475569' }}>No sessions yet</p>
                <p style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>Complete your first quiz to see history</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((h, i) => (
                  <Link key={h.session_id} href={`/quiz/${h.session_id}`} style={{ textDecoration: 'none' }}>
                    <motion.div
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ x: 3, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: `${getDifficultyColor(h.difficulty)}20`,
                            border: `1px solid ${getDifficultyColor(h.difficulty)}40`,
                            color: getDifficultyColor(h.difficulty), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            {h.difficulty}
                          </span>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: h.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            border: `1px solid ${h.status === 'completed' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                            color: h.status === 'completed' ? '#34D399' : '#FCD34D', fontWeight: 600,
                          }}>
                            {h.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#475569' }}>
                          {h.total_questions} questions · {formatDate(h.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {h.status === 'completed' && <ScoreBadge score={h.score} />}
                        <ChevronRight size={14} color="#334155" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}

            {/* Stats summary */}
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  {[
                    { label: 'Sessions', value: history.length, icon: '📊' },
                    {
                      label: 'Avg Score',
                      value: Math.round(history.filter(h => h.status === 'completed').reduce((acc, h) => acc + h.score, 0) / (history.filter(h => h.status === 'completed').length || 1)) + '%',
                      icon: '🎯',
                    },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: 18 }}>{s.icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
