'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  Layers, RotateCcw, CheckCircle, Loader2, Plus,
  Sparkles, ChevronLeft, ChevronRight, Trophy, Brain, Zap
} from 'lucide-react';
import { flashcardsApi, documentsApi } from '@/lib/api';
import type { FlashcardResponse, DocumentResponse } from '@/lib/types';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

/* ─── Particle Burst ─────────────────────────────────────────────────────────── */
function ParticleBurst({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * 360;
        const dist = 60 + Math.random() * 80;
        const dx = Math.cos((angle * Math.PI) / 180) * dist;
        const dy = Math.sin((angle * Math.PI) / 180) * dist;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: dx, y: dy, scale: 0, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.02 }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 6 + Math.random() * 6,
              height: 6 + Math.random() * 6,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Ripple Effect ──────────────────────────────────────────────────────────── */
function RippleEffect({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0.5, opacity: 0.7 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 120, height: 120,
            borderRadius: '50%',
            border: `2px solid ${color}`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Ratings ────────────────────────────────────────────────────────────────── */
const RATINGS = [
  { value: 0, label: 'Again',  emoji: '🔄', color: '#FB7185', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)' },
  { value: 2, label: 'Hard',   emoji: '😓', color: '#FCD34D', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  { value: 3, label: 'Good',   emoji: '👍', color: '#60A5FA', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  { value: 5, label: 'Easy',   emoji: '⚡', color: '#34D399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
];

/* ─── Flip Card ──────────────────────────────────────────────────────────────── */
function FlipCard({ card, index, total, onRate }: {
  card: FlashcardResponse; index: number; total: number; onRate: (q: number) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [lastRating, setLastRating] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [ripple, setRipple] = useState(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const srx = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const sry = useSpring(rotateY, { stiffness: 150, damping: 20 });

  useEffect(() => { setFlipped(false); setLastRating(null); setBurst(false); setRipple(false); }, [card.id]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (flipped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotateX.set(-dy * 8);
    rotateY.set(dx * 8);
  }
  function onMouseLeave() { rotateX.set(0); rotateY.set(0); }

  function handleRate(value: number) {
    setLastRating(value);
    if (value >= 3) {
      setBurst(true);
      setTimeout(() => setBurst(false), 800);
    } else {
      setRipple(true);
      setTimeout(() => setRipple(false), 900);
    }
    setTimeout(() => onRate(value), 400);
  }

  const progress = total > 0 ? index / total : 0;
  const ratingColor = lastRating !== null ? RATINGS.find(r => r.value === lastRating)?.color ?? '#6366F1' : '#6366F1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%' }}>
      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 580 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 10, fontWeight: 500 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={12} color="#818CF8" /> Card {index + 1} of {total}
          </span>
          <span className="badge badge-indigo">{Math.round(progress * 100)}% complete</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#4F46E5,#7C3AED,#22D3EE)' }}
          />
        </div>
      </div>

      {/* Card */}
      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={() => !flipped && setFlipped(true)}
        style={{ width: '100%', maxWidth: 580, height: 320, perspective: 1200, cursor: flipped ? 'default' : 'pointer', position: 'relative' }}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Show question' : 'Reveal answer'}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !flipped && setFlipped(true)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, type: 'spring', stiffness: 180, damping: 22 }}
          style={{
            width: '100%', height: '100%',
            position: 'relative', transformStyle: 'preserve-3d',
            rotateX: srx,
            rotateY: flipped ? 180 : sry,
          }}
        >
          {/* Front face */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            borderRadius: 28,
            background: 'rgba(10,22,40,0.75)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(40px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 40, textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)' }} />

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
            >
              <Brain size={20} color="#818CF8" />
            </motion.div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#334155', textTransform: 'uppercase', marginBottom: 16 }}>Question</div>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', lineHeight: 1.55, maxWidth: 420 }}>{card.front}</p>

            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}
            >
              <RotateCcw size={12} /> Click to reveal answer
            </motion.div>
          </div>

          {/* Back face */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            borderRadius: 28,
            background: 'linear-gradient(135deg, rgba(25,30,60,0.9), rgba(15,25,50,0.85))',
            border: '1px solid rgba(99,102,241,0.4)',
            backdropFilter: 'blur(40px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 40, textAlign: 'center',
            transform: 'rotateY(180deg)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(79,70,229,0.15)',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.12), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />

            <ParticleBurst active={burst} color="#34D399" />
            <RippleEffect active={ripple} color="#FB7185" />

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#6366F1', textTransform: 'uppercase', marginBottom: 16 }}>Answer</div>
            <p style={{ fontSize: 17, color: '#C7D2FE', lineHeight: 1.72, maxWidth: 440 }}>{card.back}</p>

            <div style={{ marginTop: 20, display: 'flex', gap: 16, fontSize: 11, color: '#334155' }}>
              <span>Interval: <strong style={{ color: '#64748B' }}>{card.interval}d</strong></span>
              <span>Ease: <strong style={{ color: '#64748B' }}>{card.ease.toFixed(1)}</strong></span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Rating buttons */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{ display: 'flex', gap: 12 }}
          >
            {RATINGS.map(({ value, label, emoji, color, bg, border }) => (
              <motion.button
                key={value}
                onClick={() => handleRate(value)}
                whileHover={{ scale: 1.06, y: -4 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  padding: '12px 28px', borderRadius: 16,
                  border: `1px solid ${border}`,
                  background: bg, color, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  boxShadow: `0 4px 20px ${color}20`,
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 32px ${color}40`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 4px 20px ${color}20`)}
              >
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span>{label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard hint */}
      {flipped && (
        <p style={{ fontSize: 11, color: '#1E293B' }}>Rate your recall — this improves your spaced repetition schedule</p>
      )}
    </div>
  );
}

/* ─── Done State ─────────────────────────────────────────────────────────────── */
function DoneScreen({ onRefresh }: { onRefresh: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ textAlign: 'center', paddingTop: 80, maxWidth: 480, margin: '0 auto' }}
    >
      <motion.div
        animate={{ rotate: [0, -8, 8, -8, 0] }}
        transition={{ delay: 0.5, duration: 0.8 }}
        style={{ fontSize: 72, marginBottom: 24, display: 'block' }}
      >
        🎉
      </motion.div>
      <motion.div
        animate={{ boxShadow: ['0 0 30px rgba(52,211,153,0.3)', '0 0 60px rgba(52,211,153,0.5)', '0 0 30px rgba(52,211,153,0.3)'] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 100, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399', fontSize: 13, fontWeight: 700, marginBottom: 24 }}
      >
        <Trophy size={15} /> Session Complete
      </motion.div>
      <h2 style={{ fontSize: 40, fontWeight: 900, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.04em' }}>All caught up!</h2>
      <p style={{ color: '#64748B', fontSize: 16, lineHeight: 1.65, marginBottom: 40 }}>
        No more cards due for today. Your spaced repetition schedule will bring them back at the perfect time.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <motion.button
          onClick={onRefresh}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: 15, fontFamily: 'inherit' }}
        >
          <RotateCcw size={16} /> Refresh cards
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function FlashcardsPage() {
  const params = useSearchParams();
  const [cards, setCards] = useState<FlashcardResponse[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>(params?.get('doc') ?? '');
  const [showGenPanel, setShowGenPanel] = useState(false);

  const loadDue = useCallback(async () => {
    setLoading(true);
    try {
      const due = await flashcardsApi.due();
      setCards(due); setIndex(0); setDone(due.length === 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadDue();
    documentsApi.list().then(setDocs).catch(() => {});
  }, [loadDue]);

  async function handleRate(quality: number) {
    if (!cards[index]) return;
    await flashcardsApi.review({ card_id: cards[index].id, quality });
    if (index + 1 >= cards.length) setDone(true);
    else setIndex(i => i + 1);
  }

  async function generateCards() {
    if (!selectedDoc) return;
    setGenerating(true);
    try { await flashcardsApi.generate({ document_id: selectedDoc }); await loadDue(); }
    catch { /* silent */ }
    finally { setGenerating(false); setShowGenPanel(false); }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 40px 140px', maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}
        >
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 4 }}>Flashcards</h1>
            <p style={{ color: '#64748B', fontSize: 14 }}>
              Spaced repetition · {loading ? '…' : cards.length} cards due today
            </p>
          </div>

          <motion.button
            onClick={() => setShowGenPanel(v => !v)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary"
            style={{ fontSize: 14, padding: '10px 20px', borderRadius: 14 }}
          >
            <Plus size={15} /> Generate cards
          </motion.button>
        </motion.div>

        {/* Generate panel */}
        <AnimatePresence>
          {showGenPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass-card"
              style={{ marginBottom: 32, padding: 24, overflow: 'hidden' }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Generate from document</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={selectedDoc}
                  onChange={e => setSelectedDoc(e.target.value)}
                  aria-label="Select document"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 12, fontSize: 13,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <option value="">Select a document…</option>
                  {docs.map(d => <option key={d.id} value={d.id}>{d.original_name}</option>)}
                </select>
                <motion.button
                  onClick={generateCards}
                  disabled={!selectedDoc || generating}
                  whileHover={{ scale: selectedDoc ? 1.03 : 1 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12,
                    background: selectedDoc ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.05)',
                    border: 'none', color: selectedDoc ? 'white' : '#64748B',
                    fontWeight: 700, fontSize: 14, cursor: selectedDoc ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', boxShadow: selectedDoc ? '0 4px 16px rgba(79,70,229,0.4)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {generating ? <Loader2 size={14} className="animate-spin-slow" /> : <Sparkles size={14} />}
                  {generating ? 'Generating…' : 'Generate'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 80 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }}
            />
            <p style={{ color: '#475569', fontSize: 14 }}>Loading your cards…</p>
          </div>
        ) : done ? (
          <DoneScreen onRefresh={loadDue} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={cards[index]?.id}
              initial={{ opacity: 0, x: 60, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -60, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            >
              <FlipCard
                card={cards[index]}
                index={index}
                total={cards.length}
                onRate={handleRate}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
