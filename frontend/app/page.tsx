'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Brain, MessageSquare, Layers, HelpCircle,
  TrendingUp, FileText, Upload, ArrowRight, Sparkles,
  GitBranch, Star, Zap, BookOpen, Shield, ChevronDown
} from 'lucide-react';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

/* ─── Neural Canvas ──────────────────────────────────────────────────────────── */
const NODES = [
  { id: 0, x: 50, y: 50 },
  { id: 1, x: 18, y: 22 }, { id: 2, x: 82, y: 18 },
  { id: 3, x: 12, y: 72 }, { id: 4, x: 88, y: 78 },
  { id: 5, x: 50, y: 10 }, { id: 6, x: 25, y: 85 },
  { id: 7, x: 75, y: 88 }, { id: 8, x: 95, y: 42 },
  { id: 9, x: 5, y: 42 }, { id: 10, x: 62, y: 32 },
  { id: 11, x: 38, y: 68 }, { id: 12, x: 68, y: 62 },
  { id: 13, x: 32, y: 35 },
];
const EDGES = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,10],[0,11],[0,12],[0,13],
  [1,5],[1,9],[1,13],[2,5],[2,8],[2,10],[3,6],[3,9],[4,7],[4,8],[4,12],[10,2],[11,3],[12,7],[13,1],
];

function NeuralCanvas({ mousePos }: { mousePos: { x: number; y: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      const dpr = devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(t: number) {
      if (!canvas || !ctx) return;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      const mx = mousePos.x * W;
      const my = mousePos.y * H;

      const nodes = NODES.map((n, i) => ({
        x: (n.x / 100) * W + Math.sin(t * 0.0007 + i * 0.8) * 10,
        y: (n.y / 100) * H + Math.cos(t * 0.0009 + i * 0.6) * 10,
      }));

      // Edges
      EDGES.forEach(([a, b]) => {
        const from = nodes[a], to = nodes[b];
        const pulse = (Math.sin(t * 0.0015 + a * 0.5) + 1) / 2;
        const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        g.addColorStop(0, `rgba(99,102,241,${0.08 + pulse * 0.12})`);
        g.addColorStop(0.5, `rgba(6,182,212,${0.1 + pulse * 0.1})`);
        g.addColorStop(1, `rgba(124,58,237,${0.06 + pulse * 0.1})`);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Animated dot along edge
        const p = (t * 0.0004 + a * 0.25) % 1;
        const dotX = from.x + (to.x - from.x) * p;
        const dotY = from.y + (to.y - from.y) * p;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${0.5 + pulse * 0.4})`;
        ctx.fill();
      });

      // Nodes
      nodes.forEach((n, i) => {
        const pulse = (Math.sin(t * 0.0012 + i * 0.6) + 1) / 2;
        const dist = Math.hypot(n.x - mx, n.y - my);
        const proximity = Math.max(0, 1 - dist / 150);
        const r = (i === 0 ? 10 : 4 + pulse * 3) * (1 + proximity * 0.6);

        // Glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        const color = i % 3 === 0 ? '99,102,241' : i % 3 === 1 ? '6,182,212' : '124,58,237';
        grd.addColorStop(0, `rgba(${color},${0.35 + pulse * 0.2 + proximity * 0.4})`);
        grd.addColorStop(1, `rgba(${color},0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = i === 0
          ? `rgba(99,102,241,${0.8 + pulse * 0.2})`
          : `rgba(${color},${0.5 + pulse * 0.4 + proximity * 0.3})`;
        ctx.fill();
      });
    }

    function loop(t: number) {
      draw(t);
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [mousePos]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} aria-hidden />;
}

/* ─── Magnetic Button ────────────────────────────────────────────────────────── */
function MagneticButton({
  children, href, variant = 'primary', onClick,
}: {
  children: React.ReactNode;
  href?: string;
  variant?: 'primary' | 'ghost';
  onClick?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 18 });
  const sy = useSpring(y, { stiffness: 180, damping: 18 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.25);
    y.set((e.clientY - r.top - r.height / 2) * 0.25);
  }
  function onLeave() { x.set(0); y.set(0); }
  function onClickHandler(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const id = Date.now();
    setRipples(p => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples(p => p.filter(i => i.id !== id)), 700);
    onClick?.();
  }

  const className = variant === 'primary' ? 'btn-primary' : 'btn-ghost';

  const Tag = href ? motion.a : motion.button;
  return (
    // @ts-ignore
    <Tag
      ref={ref}
      href={href}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClickHandler}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      className={`${className} ripple-container`}
    >
      {ripples.map(r => (
        <span
          key={r.id}
          className="ripple-effect"
          style={{ left: r.x - 24, top: r.y - 24, width: 48, height: 48 }}
        />
      ))}
      {children}
    </Tag>
  );
}

/* ─── Feature Data ───────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: MessageSquare, color: '#818CF8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', label: 'AI Tutor Chat', desc: 'Ask anything about your documents. Get grounded, cited answers powered by RAG.' },
  { icon: FileText,      color: '#34D399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: 'Smart Notes',    desc: 'AI distills PDFs into structured notes, timelines, key terms, and exam tips.' },
  { icon: Layers,        color: '#67E8F9', bg: 'rgba(6,182,212,0.1)',  border: 'rgba(6,182,212,0.2)',  label: 'Flashcards',    desc: 'Spaced-repetition cards with SM-2 algorithm. Study smarter, not harder.' },
  { icon: HelpCircle,   color: '#FCD34D', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Adaptive Quiz',  desc: 'Questions that adapt to your weak spots in real time with instant AI feedback.' },
  { icon: TrendingUp,   color: '#86EFAC', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.15)',label: 'Progress AI',    desc: 'Visual analytics of your mastery, study streaks, and learning heatmaps.' },
  { icon: GitBranch,    color: '#F9A8D4', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.2)', label: 'Knowledge Graph',desc: 'Visualise concept relationships across all your study materials in 3D.' },
];

const STATS = [
  { value: '12K+', label: 'Documents processed', icon: FileText, color: '#818CF8' },
  { value: '98%',  label: 'Answer accuracy',      icon: Shield,   color: '#34D399' },
  { value: '5×',   label: 'Faster exam prep',     icon: Zap,      color: '#67E8F9' },
  { value: '200+', label: 'Topics mastered',       icon: Brain,    color: '#FCD34D' },
];

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Medical Student', text: 'I passed my USMLE Step 1 after 3 weeks of EduAgent. The knowledge graph revealed connections I never saw in my textbooks.', avatar: '👩🏽‍⚕️' },
  { name: 'Marcus T.', role: 'CS Undergrad', text: 'The adaptive quiz literally targets exactly what I keep getting wrong. It is scary accurate. Best study tool I have ever used.', avatar: '👨🏾‍💻' },
  { name: 'Elena K.', role: 'PhD Candidate', text: 'The AI notes feature saves me hours every week. It structures entire research papers into digestible summaries.', avatar: '👩🏼‍🔬' },
];

/* ─── Animated Counter ───────────────────────────────────────────────────────── */
function AnimatedStat({ value, label, icon: Icon, color, delay }: typeof STATS[0] & { delay: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: '28px 32px', borderRadius: 24,
        background: 'rgba(10,22,40,0.55)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(32px)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 0%, ${color}12, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 12, margin: '0 auto 12px',
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
        <span style={{
          background: `linear-gradient(135deg, ${color}, white)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {value}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#64748B', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </motion.div>
  );
}

/* ─── Typewriter Demo ────────────────────────────────────────────────────────── */
const DEMO_MESSAGES = [
  { role: 'user', text: 'What is the Central Dogma of molecular biology?' },
  { role: 'ai', text: 'The Central Dogma describes the flow of genetic information: DNA → RNA → Protein. DNA is transcribed into mRNA, which is then translated into proteins by ribosomes.' },
];

function TypewriterDemo() {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    if (phase === 0) {
      // Type user message
      let i = 0;
      const msg = DEMO_MESSAGES[0].text;
      const iv = setInterval(() => {
        setTyped(msg.slice(0, ++i));
        if (i >= msg.length) { clearInterval(iv); setTimeout(() => setPhase(1), 800); }
      }, 35);
      return () => clearInterval(iv);
    }
    if (phase === 1) {
      // Type AI message
      setTyped('');
      let i = 0;
      const msg = DEMO_MESSAGES[1].text;
      const iv = setInterval(() => {
        setTyped(msg.slice(0, ++i));
        if (i >= msg.length) { clearInterval(iv); setShowSource(true); setTimeout(() => { setPhase(0); setTyped(''); setShowSource(false); }, 4000); }
      }, 22);
      return () => clearInterval(iv);
    }
  }, [phase]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 20px' }}>
      <AnimatePresence mode="wait">
        {phase === 0 && (
          <motion.div key="user" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg, rgba(79,70,229,0.7), rgba(124,58,237,0.6))', border: '1px solid rgba(99,102,241,0.4)', fontSize: 13, color: '#E2E8F0', lineHeight: 1.5 }}>
              {typed}<span style={{ opacity: 0.5 }}>|</span>
            </div>
          </motion.div>
        )}
        {phase === 1 && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={14} color="#818CF8" />
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 13, color: '#CBD5E1', lineHeight: 1.6 }}>
                {typed}{typed.length < DEMO_MESSAGES[1].text.length && <span style={{ opacity: 0.5 }}>|</span>}
              </div>
            </div>
            <AnimatePresence>
              {showSource && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginLeft: 38 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', fontSize: 11, color: '#67E8F9' }}>
                    <FileText size={10} />
                    Biology_Chapter3.pdf · p.47
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  function onMouseMove(e: React.MouseEvent) {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', overflow: 'hidden' }} onMouseMove={onMouseMove}>
      <AuroraBackground />
      <CursorGlow />

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', height: 68,
          background: 'rgba(2, 8, 23, 0.7)',
          backdropFilter: 'blur(32px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div
            animate={{ boxShadow: ['0 0 16px rgba(79,70,229,0.4)', '0 0 28px rgba(99,102,241,0.6)', '0 0 16px rgba(79,70,229,0.4)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Brain size={18} color="white" />
          </motion.div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#F0F6FF', letterSpacing: '-0.02em' }}>EduAgent</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#6366F1' }}>-360</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['Features', 'Pricing', 'Docs'].map(item => (
            <Link key={item} href="#" style={{ padding: '7px 14px', borderRadius: 10, color: '#64748B', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#CBD5E1')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
            >{item}</Link>
          ))}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
          <Link href="/login" style={{ padding: '7px 16px', borderRadius: 10, color: '#94A3B8', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary" style={{ padding: '8px 20px', fontSize: 14, borderRadius: 12 }}>
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px 40px 60px', maxWidth: 1280, margin: '0 auto' }}>
        <motion.div style={{ flex: 1, y: heroY, opacity: heroOpacity }}>


          {/* Headline */}
          <div style={{ overflow: 'hidden' }}>
            {['Your AI', 'Study', 'Universe.'].map((word, i) => (
              <motion.div
                key={word}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 style={{
                  fontSize: 'clamp(52px, 8vw, 96px)',
                  fontWeight: 900,
                  lineHeight: 1.0,
                  letterSpacing: '-0.04em',
                  margin: 0,
                  color: i < 2 ? 'var(--text)' : 'transparent',
                  background: i === 2 ? 'linear-gradient(135deg, #818CF8, #22D3EE 50%, #A78BFA)' : undefined,
                  WebkitBackgroundClip: i === 2 ? 'text' : undefined,
                  backgroundClip: i === 2 ? 'text' : undefined,
                  WebkitTextFillColor: i === 2 ? 'transparent' : undefined,
                }}>
                  {word}
                </h1>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            style={{ fontSize: 18, color: '#64748B', maxWidth: 500, lineHeight: 1.75, marginTop: 24, marginBottom: 40 }}
          >
            Upload your study materials. Chat with them, generate flashcards, take adaptive quizzes — all in one cinematic AI workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 52 }}
          >
            <MagneticButton href="/signup" variant="primary">
              <Sparkles size={15} /> Start for free
            </MagneticButton>
            <MagneticButton href="/login" variant="ghost">
              Sign in <ArrowRight size={14} />
            </MagneticButton>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            style={{ display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <div style={{ display: 'flex' }}>
              {['👩🏽‍⚕️','👨🏾‍💻','👩🏼‍🔬','👨🏻‍🎓','👩🏿‍💼'].map((e, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--void)', marginLeft: i > 0 ? -10 : 0, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,22,40,0.9)', zIndex: 5 - i }}>
                  {e}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#FCD34D" color="#FCD34D" />)}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Trusted by 2,000+ students</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Neural Visualization Pane */}
        <motion.div
          initial={{ opacity: 0, x: 60, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ flex: 1, maxWidth: 540, marginLeft: 60, position: 'relative' }}
        >
          {/* Main card */}
          <div className="glass-card-glow" style={{ borderRadius: 32, overflow: 'hidden', background: 'rgba(8,14,28,0.65)', backdropFilter: 'blur(40px)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {[['#F43F5E','#FF6B6B'],['#F59E0B','#FBBF24'],['#10B981','#34D399']].map(([c1], i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c1, opacity: 0.6 }} />
              ))}
              <span style={{ fontSize: 12, color: '#475569', marginLeft: 8, fontWeight: 500 }}>Knowledge Graph — Biology</span>
            </div>

            {/* Canvas */}
            <div style={{ height: 280, position: 'relative' }}>
              <NeuralCanvas mousePos={mousePos} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div className="animate-breathe" style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(79,70,229,0.6)' }}>
                  <Brain size={26} color="white" />
                </div>
              </div>
            </div>

            {/* AI Chat preview */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <TypewriterDemo />
              {/* Input bar */}
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <MessageSquare size={14} color="#475569" />
                  <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>Ask your documents anything…</span>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={13} color="white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} style={{ position: 'absolute', top: -20, right: -20, padding: '10px 14px', borderRadius: 14, background: 'rgba(8,14,28,0.85)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 30px rgba(99,102,241,0.2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', animation: 'pulse-glow 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1' }}>AI is active</span>
          </motion.div>

          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }} style={{ position: 'absolute', bottom: 20, left: -30, padding: '10px 14px', borderRadius: 14, background: 'rgba(8,14,28,0.85)', border: '1px solid rgba(6,182,212,0.25)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={14} color="#22D3EE" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>5× faster prep</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', paddingBottom: 32 }}
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <ChevronDown size={20} color="#334155" />
        </motion.div>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {STATS.map((s, i) => <AnimatedStat key={s.label} {...s} delay={i * 0.1} />)}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 40px 100px', maxWidth: 1280, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <div className="badge badge-indigo" style={{ marginBottom: 16 }}>
            <Sparkles size={11} /> Six AI-powered tools
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16 }}>
            <span className="gradient-text">Everything you need</span><br />
            <span style={{ color: 'var(--text)' }}>to ace your exams.</span>
          </h2>
          <p style={{ fontSize: 17, color: '#64748B', maxWidth: 500, margin: '0 auto' }}>
            Six AI tools, one workspace. Each one designed to close your knowledge gaps faster.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                style={{
                  padding: 28, borderRadius: 24,
                  background: 'rgba(10,22,40,0.55)',
                  border: `1px solid ${f.border}`,
                  backdropFilter: 'blur(32px)',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 0% 0%, ${f.bg}, transparent 60%)`, pointerEvents: 'none' }} />
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 6 }}
                  style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: f.bg, border: `1px solid ${f.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 18,
                  }}
                >
                  <Icon size={22} color={f.color} />
                </motion.div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{f.label}</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '40px 40px 100px', maxWidth: 1280, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em' }}>
            <span className="gradient-text">Students love it.</span>
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="animate-float"
              style={{ animationDelay: `${i * 1.5}s`, padding: 28, borderRadius: 24, background: 'rgba(10,22,40,0.55)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(32px)' }}
            >
              <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="#FCD34D" color="#FCD34D" />)}
              </div>
              <p style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 40px 120px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: 680, margin: '0 auto', padding: '72px 48px', borderRadius: 40, position: 'relative', overflow: 'hidden' }}
          className="glass-card-glow"
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.18), transparent 65%)', pointerEvents: 'none' }} />
          <motion.div
            className="animate-float"
            style={{ fontSize: 64, marginBottom: 20, display: 'block' }}
          >
            🧠
          </motion.div>
          <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
            <span className="gradient-text-aurora">Ready to learn differently?</span>
          </h2>
          <p style={{ color: '#64748B', marginBottom: 36, fontSize: 17, maxWidth: 400, margin: '0 auto 36px' }}>
            Join thousands of students who study smarter with EduAgent-360.
          </p>
          <MagneticButton href="/signup" variant="primary">
            Start for free — no credit card <ArrowRight size={16} />
          </MagneticButton>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={16} color="#6366F1" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>EduAgent-360</span>
        </div>
        <span style={{ fontSize: 13, color: '#1E293B' }}>© 2026 EduAgent-360. All rights reserved.</span>
      </footer>
    </div>
  );
}
