'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle, AlertCircle,
  Clock, Brain, Sparkles, ChevronRight, Layers, MessageSquare, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { documentsApi } from '@/lib/api';
import { formatRelativeTime, truncate } from '@/lib/utils';
import type { DocumentResponse } from '@/lib/types';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const STAGES = [
  { key: 'parsing',   label: 'Parsing PDF',         icon: FileText,   color: '#818CF8', threshold: 30 },
  { key: 'embedding', label: 'Creating embeddings',  icon: Brain,      color: '#22D3EE', threshold: 60 },
  { key: 'analysing', label: 'AI analysis',          icon: Sparkles,   color: '#A78BFA', threshold: 85 },
  { key: 'done',      label: 'Indexed & ready',      icon: CheckCircle,color: '#34D399', threshold: 100 },
];

/* ─── Drag Particles ─────────────────────────────────────────────────────────── */
function DragParticles({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 24 }, (_, i) => (
        <motion.div
          key={i}
          initial={{
            x: `${Math.random() * 100}%`,
            y: '110%',
            opacity: 0,
          }}
          animate={{
            y: `${20 + Math.random() * 60}%`,
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 1.5 + Math.random() * 1,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: 3 + Math.random() * 5,
            height: 3 + Math.random() * 5,
            borderRadius: '50%',
            background: ['#818CF8', '#22D3EE', '#A78BFA', '#34D399'][Math.floor(Math.random() * 4)],
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Upload Progress Stages ─────────────────────────────────────────────────── */
function ProgressStages({ progress }: { progress: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>
      {STAGES.map((s, i) => {
        const prev = i > 0 ? STAGES[i - 1].threshold : 0;
        const isActive = progress >= prev && progress < s.threshold;
        const isDone = progress >= s.threshold;
        const Icon = s.icon;

        return (
          <motion.div
            key={s.key}
            initial={{ opacity: 0.4, x: -8 }}
            animate={isActive || isDone ? { opacity: 1, x: 0 } : { opacity: 0.35 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <motion.div
              animate={isDone ? { background: `${s.color}25`, borderColor: `${s.color}50`, boxShadow: `0 0 16px ${s.color}40` } : isActive ? { background: `${s.color}15`, borderColor: `${s.color}40` } : {}}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              {isActive ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${s.color}40`, borderTopColor: s.color }} />
                </motion.div>
              ) : (
                <Icon size={16} color={isDone ? s.color : '#334155'} />
              )}
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? s.color : isActive ? 'var(--text)' : '#334155' }}>
                {s.label}
              </div>
              {isActive && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8 }}
                  style={{ height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${s.color}, transparent)`, marginTop: 4 }}
                />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Document Card ──────────────────────────────────────────────────────────── */
function DocCard({ doc, index }: { doc: DocumentResponse; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px',
        borderRadius: 20,
        background: 'rgba(10,22,40,0.55)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(32px)',
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <FileText size={22} color="#818CF8" />
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#34D399', border: '2px solid var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={8} color="white" />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {truncate(doc.original_name, 50)}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layers size={11} /> {doc.chunk_count} chunks
          </span>
          <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {formatRelativeTime(doc.created_at)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {[
          { label: 'Notes',  href: `/notes/${doc.id}`,         icon: BookOpen,     color: '#A78BFA' },
          { label: 'Chat',   href: `/chat?doc=${doc.id}`,      icon: MessageSquare,color: '#818CF8' },
          { label: 'Cards',  href: `/flashcards?doc=${doc.id}`,icon: Layers,       color: '#22D3EE' },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, background: `${color}12`, border: `1px solid ${color}30`, fontSize: 12, color, fontWeight: 600, cursor: 'pointer' }}
            >
              <Icon size={12} /> {label}
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function UploadPage() {
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadMsg, setUploadMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const loadDocs = useCallback(async () => {
    try { const d = await documentsApi.list(); setDocs(d); }
    catch { /* silent */ }
    finally { setLoadingDocs(false); }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadState('error');
      setUploadMsg('Only PDF files are supported. Please upload a .pdf file.');
      return;
    }
    setUploadState('uploading');
    setProgress(0);
    setUploadMsg('');

    // Staged progress simulation
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p < 28) return p + 4;
        if (p < 58) return p + 2.5;
        if (p < 82) return p + 1.5;
        return Math.min(p + 0.5, 90);
      });
    }, 180);

    try {
      await documentsApi.upload(file);
      clearInterval(progressRef.current);
      setProgress(100);
      setUploadState('success');
      setUploadMsg(`"${file.name}" processed and indexed successfully!`);
      await loadDocs();
      setTimeout(() => setUploadState('idle'), 4000);
    } catch (err: unknown) {
      clearInterval(progressRef.current);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed. Please try again.';
      setUploadState('error');
      setUploadMsg(msg);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 40px 140px', maxWidth: 940, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
          <div className="badge badge-cyan" style={{ marginBottom: 14 }}>
            <Upload size={10} /> Document Library
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 8 }}>
            Upload Documents
          </h1>
          <p style={{ color: '#64748B', fontSize: 15, maxWidth: 480 }}>
            Upload PDFs to unlock AI chat, smart notes, flashcards, adaptive quizzes, and your knowledge graph.
          </p>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => uploadState === 'idle' && fileRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload PDF file"
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
          style={{
            borderRadius: 28, padding: '56px 40px', textAlign: 'center',
            border: `2px dashed ${dragging ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
            background: dragging
              ? 'rgba(99,102,241,0.07)'
              : 'rgba(10,22,40,0.45)',
            backdropFilter: 'blur(32px)',
            cursor: uploadState === 'idle' ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: dragging ? '0 0 0 4px rgba(99,102,241,0.15), 0 0 60px rgba(99,102,241,0.1)' : 'none',
            marginBottom: 36,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <input
            ref={fileRef}
            type="file" accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            aria-label="File input"
          />

          {/* Drag particles */}
          <DragParticles active={dragging} />

          {/* Corner accents */}
          {dragging && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
            <motion.div key={pos} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
              position: 'absolute',
              top: pos.includes('top') ? 12 : 'auto',
              bottom: pos.includes('bottom') ? 12 : 'auto',
              left: pos.includes('left') ? 12 : 'auto',
              right: pos.includes('right') ? 12 : 'auto',
              width: 24, height: 24,
              borderTop: pos.includes('top') ? '2px solid rgba(99,102,241,0.6)' : 'none',
              borderBottom: pos.includes('bottom') ? '2px solid rgba(99,102,241,0.6)' : 'none',
              borderLeft: pos.includes('left') ? '2px solid rgba(99,102,241,0.6)' : 'none',
              borderRight: pos.includes('right') ? '2px solid rgba(99,102,241,0.6)' : 'none',
              borderRadius: pos === 'top-left' ? '4px 0 0 0' : pos === 'top-right' ? '0 4px 0 0' : pos === 'bottom-left' ? '0 0 0 4px' : '0 0 4px 0',
            }} />
          ))}

          <AnimatePresence mode="wait">
            {uploadState === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div
                  animate={{ y: dragging ? -16 : 0, scale: dragging ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ width: 72, height: 72, borderRadius: 22, background: dragging ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', border: `1px solid ${dragging ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: dragging ? '0 0 40px rgba(99,102,241,0.3)' : 'none', transition: 'box-shadow 0.3s' }}
                >
                  <Upload size={32} color="#818CF8" />
                </motion.div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.02em' }}>
                  {dragging ? '✨ Release to upload' : 'Drop your PDF here'}
                </div>
                <div style={{ fontSize: 15, color: '#64748B', marginBottom: 20 }}>
                  {dragging ? 'Almost there…' : 'or click to browse your files'}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: '#475569' }}>
                  <FileText size={12} /> PDF only · Max 50 MB
                </div>
              </motion.div>
            )}

            {uploadState === 'uploading' && (
              <motion.div key="uploading" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }}
                />
                <ProgressStages progress={progress} />
                <div style={{ width: 320, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#4F46E5,#7C3AED,#22D3EE)' }}
                  />
                </div>
                <p style={{ fontSize: 13, color: '#475569' }}>{Math.round(progress)}% complete</p>
              </motion.div>
            )}

            {uploadState === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                <motion.div
                  animate={{ boxShadow: ['0 0 20px rgba(52,211,153,0.3)', '0 0 50px rgba(52,211,153,0.5)', '0 0 20px rgba(52,211,153,0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}
                >
                  <CheckCircle size={34} color="#34D399" />
                </motion.div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#34D399', marginBottom: 8, letterSpacing: '-0.02em' }}>Document ready!</div>
                <div style={{ fontSize: 14, color: '#64748B', maxWidth: 400, lineHeight: 1.6 }}>{uploadMsg}</div>
              </motion.div>
            )}

            {uploadState === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <AlertCircle size={30} color="#FB7185" />
                </div>
                <div style={{ fontSize: 16, color: '#FB7185', marginBottom: 16, fontWeight: 600 }}>{uploadMsg}</div>
                <motion.button
                  onClick={() => setUploadState('idle')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}
                >
                  Try again
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Library */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 8 }}>
              Your Library
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 10px', borderRadius: 100 }}>
                {docs.length} files
              </span>
            </h2>
          </div>

          {loadingDocs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 82, borderRadius: 20 }} />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '60px 40px', borderRadius: 24, background: 'rgba(10,22,40,0.4)', border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              <FileText size={44} style={{ margin: '0 auto 16px', opacity: 0.15 }} color="var(--text)" />
              <p style={{ fontSize: 16, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Your library is empty</p>
              <p style={{ fontSize: 14, color: '#334155' }}>Upload your first PDF to get started</p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {docs.map((doc, i) => (
                <DocCard key={doc.id} doc={doc} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
