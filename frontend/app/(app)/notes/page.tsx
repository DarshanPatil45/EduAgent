'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Loader2, BookOpen, Sparkles, ChevronRight } from 'lucide-react';
import { documentsApi } from '@/lib/api';
import type { DocumentResponse } from '@/lib/types';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';
import GlassCard from '@/components/ui/GlassCard';

export default function NotesIndexPage() {
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentsApi.list()
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 40px 140px', maxWidth: 860, margin: '0 auto' }}>
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
          <div className="badge badge-indigo" style={{ marginBottom: 14 }}>
            <Sparkles size={10} /> Smart Notes
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 8 }}>
            Distilled Notes
          </h1>
          <p style={{ color: '#64748B', fontSize: 15 }}>
            AI-extracted key concepts, definitions, highlights, and exam-readiness summaries.
          </p>
        </motion.div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '30vh', gap: 16 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }}
            />
            <p style={{ color: '#475569', fontSize: 14 }}>Loading documents…</p>
          </div>
        ) : docs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '60px 40px', borderRadius: 24, background: 'rgba(10,22,40,0.4)', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <FileText size={44} style={{ margin: '0 auto 16px', opacity: 0.15 }} color="var(--text)" />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>No documents found</h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
              Upload a PDF document first to generate interactive study notes automatically.
            </p>
            <Link href="/upload" style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                style={{ padding: '10px 24px', borderRadius: 12 }}
              >
                Upload PDF
              </motion.div>
            </Link>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {docs.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 280, damping: 24 }}
              >
                <Link href={`/notes/${doc.id}`} style={{ textDecoration: 'none' }}>
                  <GlassCard
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '20px 24px', cursor: 'pointer', transition: 'all 0.25s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', flexShrink: 0,
                      }}>
                        <FileText size={20} color="#818CF8" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.original_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                          {doc.chunk_count} key segments analyzed
                        </div>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ x: 2 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#818CF8' }}
                    >
                      <BookOpen size={14} /> View Notes <ChevronRight size={14} />
                    </motion.div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
