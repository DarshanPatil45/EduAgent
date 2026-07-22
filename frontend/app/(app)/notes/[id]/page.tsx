'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, BookOpen, Target, ChevronDown, ChevronUp, Sparkles, ArrowLeft, Loader2, Star } from 'lucide-react';
import Link from 'next/link';
import { notesApi } from '@/lib/api';
import type { NotesResponse } from '@/lib/types';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';
import GlassCard from '@/components/ui/GlassCard';

function KeyTermChip({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout
      onClick={() => setOpen(!open)}
      whileHover={{ scale: 1.01 }}
      style={{
        borderRadius: 14, cursor: 'pointer',
        background: open ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${open ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
        overflow: 'hidden', transition: 'border-color 0.25s, background 0.25s',
      }}
    >
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818CF8', boxShadow: '0 0 8px #818CF8', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#C7D2FE' }}>{term}</span>
        </div>
        {open ? <ChevronUp size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 14px 34px', fontSize: 13, color: '#94A3B8', lineHeight: 1.65 }}>
              {definition}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionBlock({ heading, points, index }: { heading: string; points: string[]; index: number }) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ marginBottom: 16 }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderRadius: open ? '20px 20px 0 0' : 20,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: open ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.07)',
          cursor: 'pointer', color: '#E2E8F0', fontFamily: 'inherit', outline: 'none',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{['📌','🔑','💡','🎯','📚','⚡','🧩','🔬'][index % 8]}</span>
          {heading}
        </span>
        {open ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderTop: 'none',
              borderRadius: '0 0 20px 20px',
            }}
          >
            <ul style={{ padding: '18px 24px 18px 36px', margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {points.map((pt, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, listStyle: 'none', position: 'relative' }}
                >
                  <span style={{ position: 'absolute', left: -16, top: 8, width: 5, height: 5, borderRadius: '50%', background: 'rgba(99,102,241,0.6)', boxShadow: '0 0 6px rgba(99,102,241,0.5)' }} />
                  {pt}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function NotesPage() {
  const params = useParams();
  const docId = params?.id as string;
  const [notes, setNotes] = useState<NotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!docId) return;
    notesApi.get(docId)
      .then(setNotes)
      .catch(() => setError('Could not load notes. Make sure the document has been uploaded.'))
      .finally(() => setLoading(false));
  }, [docId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
          <Loader2 size={40} color="#6366F1" />
        </motion.div>
        <p style={{ color: '#64748B', fontSize: 14 }}>Generating smart notes with AI…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />
      <div style={{ padding: 48, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ color: '#FB7185', marginBottom: 16, fontSize: 15, fontWeight: 600 }}>{error}</div>
        <Link href="/upload" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 600 }}>← Back to documents</Link>
      </div>
    </div>
  );

  if (!notes) return null;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 40px 140px', maxWidth: 860, margin: '0 auto' }}>
        {/* Back */}
        <Link href="/upload" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ x: -2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, marginBottom: 28, fontWeight: 600 }}
          >
            <ArrowLeft size={14} /> Back to documents
          </motion.div>
        </Link>

        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={22} color="#818CF8" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notes.title}</h1>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>Source: {notes.source}</div>
            </div>
          </div>

          {/* Summary Box */}
          <GlassCard style={{ padding: '20px 24px', background: 'rgba(99,102,241,0.07)', borderColor: 'rgba(99,102,241,0.25)', marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#818CF8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} /> AI Core Summary
            </div>
            <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.75, margin: 0 }}>{notes.summary}</p>
          </GlassCard>
        </motion.div>

        {/* Key Terms */}
        {notes.key_terms.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
              <BookOpen size={16} color="#818CF8" /> Key Glossary
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 500, background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 8 }}>{notes.key_terms.length} terms</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {notes.key_terms.map((kt) => (
                <KeyTermChip key={kt.term} term={kt.term} definition={kt.definition} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Sections */}
        {notes.sections.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
              📝 Section Summaries
            </h2>
            {notes.sections.map((s, i) => (
              <SectionBlock key={s.heading} heading={s.heading} points={s.points} index={i} />
            ))}
          </motion.section>
        )}

        {/* Exam Focus */}
        {notes.exam_focus.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
              <Target size={16} color="#F59E0B" /> Exam Focus Highlights
            </h2>
            <GlassCard style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(251,191,36,0.03))',
              borderColor: 'rgba(245,158,11,0.25)',
              boxShadow: '0 8px 32px rgba(245,158,11,0.05)',
            }}>
              <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notes.exam_focus.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', fontSize: 14, color: '#FDE68A', lineHeight: 1.65 }}
                  >
                    <Star size={14} color="#F59E0B" fill="#F59E0B" style={{ flexShrink: 0, marginTop: 3 }} />
                    <div>{item}</div>
                  </motion.li>
                ))}
              </ul>
            </GlassCard>
          </motion.section>
        )}
      </div>
    </div>
  );
}
