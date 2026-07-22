'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Brain, User, FileText, Plus, Sparkles,
  ExternalLink, ChevronRight, Paperclip, Mic, X
} from 'lucide-react';
import { chatApi, documentsApi } from '@/lib/api';
import type { ChatMessage, DocumentResponse } from '@/lib/types';
import { truncate } from '@/lib/utils';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

/* ─── Animated AI Orb ────────────────────────────────────────────────────────── */
function AIOrb({ size = 36, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <motion.div
      animate={pulse ? {
        boxShadow: [
          '0 0 20px rgba(99,102,241,0.4)',
          '0 0 40px rgba(99,102,241,0.7)',
          '0 0 20px rgba(99,102,241,0.4)',
        ]
      } : {}}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(124,58,237,0.2))',
        border: '1px solid rgba(99,102,241,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.4), transparent)', borderRadius: '50%' }} />
      <Brain size={size * 0.45} color="#818CF8" />
    </motion.div>
  );
}

/* ─── Typing Indicator ───────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '6px 4px' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1' }}
        />
      ))}
    </div>
  );
}

/* ─── Message Bubble ─────────────────────────────────────────────────────────── */
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      style={{
        display: 'flex',
        gap: 12,
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
      }}
    >
      {isUser ? (
        <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
          <User size={15} color="white" />
        </div>
      ) : (
        <AIOrb size={34} />
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{
          padding: '13px 18px',
          borderRadius: isUser ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
          background: isUser
            ? 'linear-gradient(135deg, rgba(79,70,229,0.75), rgba(124,58,237,0.65))'
            : 'rgba(255,255,255,0.05)',
          border: isUser ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          fontSize: 14, color: isUser ? '#E2E8F0' : '#CBD5E1', lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          boxShadow: isUser
            ? '0 8px 24px rgba(79,70,229,0.25)'
            : '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {msg.content}
        </div>

        {/* Badges */}
        {(msg.intent || msg.grounded === false) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            {msg.intent && msg.intent !== '' && (
              <span className="badge badge-indigo" style={{ fontSize: 10 }}>
                <Sparkles size={9} /> {msg.intent}
              </span>
            )}
            {msg.grounded === false && (
              <span className="badge badge-rose" style={{ fontSize: 10 }}>⚠ Not grounded</span>
            )}
          </div>
        )}

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {msg.sources.slice(0, 4).map((src, i) => (
              <div key={i} className="badge badge-cyan" style={{ fontSize: 10 }}>
                <FileText size={9} />
                {typeof src.source === 'string' ? truncate(src.source, 22) : `Source ${i+1}`}
                {src.page && ` · p.${src.page}`}
                <ExternalLink size={9} />
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Suggested Prompts ──────────────────────────────────────────────────────── */
const STARTERS = [
  { icon: '📖', text: 'Summarise this document for me' },
  { icon: '🔑', text: 'What are the key concepts?' },
  { icon: '❓', text: 'Give me a quiz question on this topic' },
  { icon: '⚠️', text: 'What am I likely to struggle with?' },
  { icon: '🗺️', text: 'Create a mind map of the main ideas' },
  { icon: '🧪', text: 'Explain this with an example' },
];

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | undefined>(params?.get('doc') ?? undefined);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { documentsApi.list().then(setDocs).catch(() => {}); }, []);
  useEffect(() => {
    const q = params?.get('q');
    if (q) setInput(q);
  }, [params]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await chatApi.send({ query: q, session_id: sessionId, document_id: selectedDoc });
      setSessionId(res.session_id);
      setMessages(prev => [...prev, {
        role: 'assistant', content: res.answer, intent: res.intent,
        sources: res.sources, grounded: res.grounded, weak_concepts: res.weak_concepts,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  }, [input, loading, sessionId, selectedDoc]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            style={{
              width: 270, flexShrink: 0, zIndex: 10,
              background: 'rgba(6, 11, 22, 0.75)',
              backdropFilter: 'blur(40px)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column',
              padding: '20px 14px',
              gap: 8,
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Context</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}>
                <X size={14} />
              </button>
            </div>

            {/* All docs option */}
            <motion.div
              whileHover={{ x: 2 }}
              onClick={() => setSelectedDoc(undefined)}
              style={{
                padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                background: !selectedDoc ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${!selectedDoc ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.05)'}`,
                fontSize: 13, color: !selectedDoc ? '#A5B4FC' : '#64748B',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Sparkles size={13} color={!selectedDoc ? '#818CF8' : '#64748B'} />
              All documents
            </motion.div>

            <div style={{ fontSize: 10, fontWeight: 600, color: '#1E293B', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8, marginBottom: 4, paddingLeft: 4 }}>
              Your files
            </div>

            {docs.map(doc => (
              <motion.div
                key={doc.id}
                whileHover={{ x: 2 }}
                onClick={() => setSelectedDoc(doc.id)}
                style={{
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                  background: selectedDoc === doc.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedDoc === doc.id ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.05)'}`,
                  fontSize: 13, color: selectedDoc === doc.id ? '#A5B4FC' : '#64748B',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <FileText size={13} color={selectedDoc === doc.id ? '#818CF8' : '#64748B'} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {truncate(doc.original_name, 24)}
                </span>
              </motion.div>
            ))}

            {/* New chat */}
            <button
              onClick={() => { setMessages([]); setSessionId(undefined); }}
              style={{
                marginTop: 'auto', padding: '10px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                color: '#64748B', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; (e.currentTarget as HTMLElement).style.color = '#A5B4FC'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
            >
              <Plus size={14} /> New conversation
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar toggle */}
      {!sidebarOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            zIndex: 20, width: 28, height: 56, borderRadius: 12,
            background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)', color: '#64748B', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronRight size={14} />
        </motion.button>
      )}

      {/* ── Main Chat ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', paddingTop: 60 }}
            >
              {/* Hero orb */}
              <motion.div
                animate={{ boxShadow: ['0 0 40px rgba(99,102,241,0.3)', '0 0 80px rgba(99,102,241,0.5)', '0 0 40px rgba(99,102,241,0.3)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.2))', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative' }}
              >
                <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.5), transparent)', pointerEvents: 'none' }} />
                <Brain size={34} color="#818CF8" />
              </motion.div>

              <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.03em' }}>Ask your documents anything</h2>
              <p style={{ color: '#475569', fontSize: 15, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
                I can explain concepts, quiz you, generate summaries, and identify where you need to focus.
              </p>

              {/* Suggested prompts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, maxWidth: 680, margin: '0 auto' }}>
                {STARTERS.map(s => (
                  <motion.button
                    key={s.text}
                    whileHover={{ y: -2, background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setInput(s.text); textareaRef.current?.focus(); }}
                    style={{
                      padding: '12px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      color: '#94A3B8', fontSize: 13, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span>{s.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((m, i) => <Bubble key={i} msg={m} />)}

          {/* Typing indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24 }}
              >
                <AIOrb size={34} pulse />
                <div style={{ padding: '13px 18px', borderRadius: '20px 20px 20px 5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <TypingDots />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* ── Input Bar ────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 28 }}
          style={{
            padding: '16px 40px 20px',
            background: 'rgba(4, 8, 18, 0.75)',
            backdropFilter: 'blur(32px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex', gap: 0, alignItems: 'flex-end',
                borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(16px)',
                transition: 'border-color 0.25s, box-shadow 0.25s',
                overflow: 'hidden',
              }}
              onFocusCapture={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12), 0 0 30px rgba(99,102,241,0.08)';
              }}
              onBlurCapture={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <button style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', borderRadius: 8, display: 'flex', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#818CF8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
                >
                  <Paperclip size={17} />
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask a question… (⏎ to send, ⇧⏎ for new line)"
                rows={1}
                aria-label="Chat input"
                style={{
                  flex: 1, padding: '15px 0',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: 14, resize: 'none',
                  fontFamily: 'inherit', lineHeight: 1.6,
                  maxHeight: 140, overflowY: 'auto',
                }}
              />

              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <motion.button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  whileHover={{ scale: input.trim() && !loading ? 1.08 : 1 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Send message"
                  style={{
                    width: 38, height: 38, borderRadius: 12, border: 'none',
                    background: input.trim() && !loading
                      ? 'linear-gradient(135deg,#4F46E5,#7C3AED)'
                      : 'rgba(255,255,255,0.05)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: input.trim() && !loading ? '0 4px 16px rgba(79,70,229,0.4)' : 'none',
                    transition: 'all 0.2s', flexShrink: 0,
                  }}
                >
                  <Send size={16} color={input.trim() && !loading ? 'white' : '#334155'} />
                </motion.button>
              </div>
            </div>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#1E293B' }}>
              Answers grounded in your uploaded documents · Sources always cited
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
