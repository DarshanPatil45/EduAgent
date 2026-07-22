'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, GitBranch, Sparkles, X, MessageSquare, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { progressApi } from '@/lib/api';
import type { WeakConcept } from '@/lib/types';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';

/* ─── Types ──────────────────────────────────────────────────────────────────── */
interface GraphNode {
  id: string;
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  glowColor: string;
  label: string;
  count: number;
  isCenter: boolean;
}

interface GraphEdge { source: string; target: string; strength: number; }

/* ─── Build graph data ───────────────────────────────────────────────────────── */
function buildGraphData(concepts: WeakConcept[], W: number, H: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const cx = W / 2, cy = H / 2;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const strengthToColor = (count: number) => {
    if (count === 0) return { color: '#34D399', glow: 'rgba(16,185,129,0.6)' };
    if (count <= 2)  return { color: '#FCD34D', glow: 'rgba(245,158,11,0.6)' };
    if (count <= 4)  return { color: '#FB923C', glow: 'rgba(251,146,60,0.6)' };
    return { color: '#FB7185', glow: 'rgba(244,63,94,0.6)' };
  };

  nodes.push({
    id: 'center', x: cx, y: cy, vx: 0, vy: 0,
    r: 40, color: '#818CF8', glowColor: 'rgba(99,102,241,0.7)',
    label: 'Knowledge\nHub', count: 0, isCenter: true,
  });

  const used: string[] = [];
  concepts.forEach((c, i) => {
    const angle = (i / concepts.length) * Math.PI * 2 - Math.PI / 2;
    const dist = 160 + (i % 2) * 70 + Math.random() * 40;
    const { color, glow } = strengthToColor(c.count);
    const r = Math.max(22, 35 - c.count * 3);
    nodes.push({
      id: c.concept, x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
      vx: 0, vy: 0, r, color, glowColor: glow, label: c.concept, count: c.count, isCenter: false,
    });
    edges.push({ source: 'center', target: c.concept, strength: 0.8 });
    used.push(c.concept);
  });

  // Cross-links
  for (let i = 0; i < concepts.length - 1; i += 3) {
    edges.push({ source: concepts[i].concept, target: concepts[Math.min(i + 1, concepts.length - 1)].concept, strength: 0.3 });
  }

  return { nodes, edges };
}

/* ─── Demo graph (when no data) ─────────────────────────────────────────────── */
function buildDemoData(W: number, H: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const demoConceptsRaw = [
    { concept: 'Key Concept A', count: 3 },
    { concept: 'Topic Overview', count: 1 },
    { concept: 'Core Principle', count: 4 },
    { concept: 'Foundational Idea', count: 2 },
    { concept: 'Main Theory', count: 0 },
    { concept: 'Supporting Concept', count: 2 },
    { concept: 'Advanced Topic', count: 3 },
    { concept: 'Linked Concept', count: 1 },
    { concept: 'Related Idea', count: 0 },
    { concept: 'Complex Topic', count: 4 },
  ];
  return buildGraphData(demoConceptsRaw, W, H);
}

/* ─── Canvas Knowledge Graph ─────────────────────────────────────────────────── */
function KnowledgeCanvas({
  nodes: initNodes,
  edges,
  onNodeClick,
  selectedId,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (n: GraphNode) => void;
  selectedId: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>(initNodes.map(n => ({ ...n })));
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: -999, y: -999 });
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, dragging: false });
  const zoomRef = useRef(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    nodesRef.current = initNodes.map(n => ({ ...n }));
  }, [initNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Particle along edges
    const edgeParticles: { edge: GraphEdge; t: number; speed: number }[] = edges.map(e => ({
      edge: e, t: Math.random(), speed: 0.001 + Math.random() * 0.002,
    }));

    function getNodeById(id: string) { return nodesRef.current.find(n => n.id === id); }

    function draw(t: number) {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const zoom = zoomRef.current;
      const panX = panRef.current.x;
      const panY = panRef.current.y;

      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // Gravity-sim: repel nodes from each other
      const ns = nodesRef.current;
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = ns[i].r + ns[j].r + 60;
          if (dist < minDist) {
            const force = (minDist - dist) / minDist * 0.5;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            ns[i].vx -= fx; ns[i].vy -= fy;
            ns[j].vx += fx; ns[j].vy += fy;
          }
        }
      }
      // Pull connected nodes
      edges.forEach(e => {
        const a = getNodeById(e.source), b = getNodeById(e.target);
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = e.strength > 0.5 ? 200 : 350;
        const force = (dist - target) / dist * 0.015 * e.strength;
        a.vx += dx * force; a.vy += dy * force;
        b.vx -= dx * force; b.vy -= dy * force;
      });

      ns.forEach(n => {
        if (n.isCenter || dragRef.current?.id === n.id) return;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
      });

      // Draw edges
      edges.forEach(e => {
        const a = getNodeById(e.source), b = getNodeById(e.target);
        if (!a || !b) return;
        const pulse = (Math.sin(t * 0.001 + e.source.length) + 1) / 2;
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        g.addColorStop(0, `rgba(99,102,241,${0.08 + pulse * 0.12 * e.strength})`);
        g.addColorStop(0.5, `rgba(6,182,212,${0.06 + pulse * 0.1 * e.strength})`);
        g.addColorStop(1, `rgba(124,58,237,${0.05 + pulse * 0.08 * e.strength})`);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = g;
        ctx.lineWidth = e.strength > 0.5 ? 1.5 : 0.8;
        ctx.stroke();
      });

      // Animate particles
      edgeParticles.forEach(p => {
        const a = getNodeById(p.edge.source), b = getNodeById(p.edge.target);
        if (!a || !b) return;
        p.t = (p.t + p.speed) % 1;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${0.6 + Math.sin(t * 0.003) * 0.3})`;
        ctx.fill();
      });

      // Draw nodes
      ns.forEach(n => {
        const pulse = (Math.sin(t * 0.0015 + n.id.length * 0.3) + 1) / 2;
        const mx = (mouseRef.current.x - panX) / zoom;
        const my = (mouseRef.current.y - panY) / zoom;
        const dist = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
        const proximity = Math.max(0, 1 - dist / (n.r + 60));
        const isSelected = selectedId === n.id;
        const isHovered = hoveredId === n.id;
        const glowSize = n.r * (2.5 + pulse * 0.8 + proximity * 1.5 + (isSelected ? 1.5 : 0));

        // Glow halo
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
        grd.addColorStop(0, n.glowColor);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Selection ring
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? n.color : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash(isSelected ? [] : [4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Core circle
        const cg = ctx.createRadialGradient(n.x - n.r * 0.3, n.y - n.r * 0.3, 0, n.x, n.y, n.r);
        cg.addColorStop(0, n.isCenter ? '#C7D2FE' : lighten(n.color));
        cg.addColorStop(1, n.color);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (1 + pulse * 0.05 + proximity * 0.08), 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();

        // Label
        if (n.isCenter) {
          const lines = n.label.split('\n');
          ctx.fillStyle = '#0F172A'; // High-contrast dark slate text inside the light center circle
          ctx.font = '800 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          lines.forEach((line, li) => {
            const lineH = 14;
            const totalH = lines.length * lineH;
            ctx.fillText(line, n.x, n.y - totalH / 2 + li * lineH + lineH / 2);
          });
        } else {
          // Draw label below the node circle for maximum space and legibility
          ctx.fillStyle = '#E2E8F0'; // Bright light-slate text
          ctx.font = '700 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          // Apply a clean drop-shadow to make text readable against dark background gradients
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 1;
          
          ctx.fillText(n.label, n.x, n.y + n.r + 8);
          
          // Reset shadow settings for subsequent drawing calls
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [edges, selectedId, hoveredId]);

  // Mouse handlers
  function getNodeAt(cx: number, cy: number) {
    const zoom = zoomRef.current;
    const wx = (cx - panRef.current.x) / zoom;
    const wy = (cy - panRef.current.y) / zoom;
    return nodesRef.current.find(n => Math.sqrt((n.x - wx) ** 2 + (n.y - wy) ** 2) <= n.r + 8);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    mouseRef.current = { x: cx, y: cy };

    if (dragRef.current) {
      const zoom = zoomRef.current;
      const n = nodesRef.current.find(n => n.id === dragRef.current!.id);
      if (n) {
        n.x = (cx - panRef.current.x) / zoom - dragRef.current.offsetX;
        n.y = (cy - panRef.current.y) / zoom - dragRef.current.offsetY;
      }
      return;
    }
    if (panRef.current.dragging) {
      panRef.current.x += cx - panRef.current.startX;
      panRef.current.y += cy - panRef.current.startY;
      panRef.current.startX = cx;
      panRef.current.startY = cy;
      return;
    }

    const n = getNodeAt(cx, cy);
    setHoveredId(n?.id ?? null);
    (e.currentTarget as HTMLElement).style.cursor = n ? 'pointer' : 'grab';
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const n = getNodeAt(cx, cy);
    if (n) {
      const zoom = zoomRef.current;
      const wx = (cx - panRef.current.x) / zoom;
      const wy = (cy - panRef.current.y) / zoom;
      dragRef.current = { id: n.id, offsetX: wx - n.x, offsetY: wy - n.y };
    } else {
      panRef.current.dragging = true;
      panRef.current.startX = cx;
      panRef.current.startY = cy;
    }
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (dragRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const n = getNodeAt(cx, cy);
      if (n) onNodeClick(n);
      dragRef.current = null;
    }
    panRef.current.dragging = false;
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomRef.current = Math.min(3, Math.max(0.3, zoomRef.current * delta));
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { mouseRef.current = { x: -999, y: -999 }; dragRef.current = null; panRef.current.dragging = false; }}
      onWheel={onWheel}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
      aria-label="Interactive knowledge graph"
    />
  );
}

function lighten(hex: string): string {
  // Simple lighten: mix with white
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)})`;
  } catch { return hex; }
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function GraphPage() {
  const [concepts, setConcepts] = useState<WeakConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function initGraph(c: WeakConcept[], demo = false) {
    const W = containerRef.current?.offsetWidth ?? 800;
    const H = containerRef.current?.offsetHeight ?? 500;
    const { nodes, edges } = demo ? buildDemoData(W, H) : buildGraphData(c, W, H);
    setGraphNodes(nodes);
    setGraphEdges(edges);
    setIsDemo(demo);
  }

  useEffect(() => {
    progressApi.summary()
      .then(p => {
        setConcepts(p.weak_concepts);
        if (p.weak_concepts.length === 0) {
          initGraph([], true);
        } else {
          initGraph(p.weak_concepts, false);
        }
      })
      .catch(() => initGraph([], true))
      .finally(() => setLoading(false));
  }, []);

  const handleNodeClick = useCallback((n: GraphNode) => {
    setSelected(prev => prev?.id === n.id ? null : n);
  }, []);

  const strengthLabel = (count: number) => {
    if (count === 0) return { label: 'Strong',     color: '#34D399' };
    if (count <= 2)  return { label: 'Developing', color: '#FCD34D' };
    if (count <= 4)  return { label: 'Weak',       color: '#FB923C' };
    return             { label: 'Critical',   color: '#FB7185' };
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: '20px 32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'relative', zIndex: 10 }}
      >
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: 8 }}>
            <GitBranch size={10} /> Knowledge Graph
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 4 }}>
            Your Knowledge Universe
          </h1>
          <p style={{ color: '#64748B', fontSize: 13 }}>
            {isDemo ? 'Demo — chat with documents and take quizzes to build your real graph' : `${concepts.length} concepts mapped · Click nodes to explore`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[['Strong', '#34D399'], ['Developing', '#FCD34D'], ['Weak', '#FB923C'], ['Critical', '#FB7185']].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
                {l}
              </div>
            ))}
          </div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { icon: RefreshCw, tip: 'Reset', action: () => initGraph(concepts, concepts.length === 0) },
            ].map(({ icon: Icon, tip, action }) => (
              <motion.button key={tip} onClick={action} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                title={tip}
                style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon size={15} />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', margin: '0 20px 20px', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(4,8,18,0.7)', backdropFilter: 'blur(40px)' }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }}
            />
            <p style={{ color: '#475569', fontSize: 14 }}>Building your knowledge graph…</p>
          </div>
        ) : (
          <>
            {isDemo && (
              <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                <div className="badge badge-amber" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D', fontSize: 11 }}>
                  <Sparkles size={10} /> Demo graph — start chatting to build your real knowledge map
                </div>
              </div>
            )}
            <KnowledgeCanvas
              nodes={graphNodes}
              edges={graphEdges}
              onNodeClick={handleNodeClick}
              selectedId={selected?.id ?? null}
            />

            {/* Scroll hint */}
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: '#1E293B', pointerEvents: 'none' }}>
              Scroll to zoom · Drag to pan · Click nodes to inspect
            </div>
          </>
        )}

        {/* Node detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 24, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{
                position: 'absolute', top: 16, right: 16, width: 260, zIndex: 20,
                background: 'rgba(6,12,26,0.92)', backdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
                padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              {/* Glow top border */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${selected.color}60, transparent)`, borderRadius: '24px 24px 0 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: selected.color, boxShadow: `0 0 10px ${selected.color}` }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Concept</span>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: 4 }}>
                  <X size={14} />
                </button>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.02em' }}>
                {selected.isCenter ? 'Knowledge Hub' : selected.label}
              </h3>

              {!selected.isCenter && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#FB7185', letterSpacing: '-0.04em' }}>{selected.count}</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 2, fontWeight: 600 }}>Mistakes</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: strengthLabel(selected.count).color, marginTop: 8 }}>
                        {strengthLabel(selected.count).label}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 2, fontWeight: 600 }}>Status</div>
                    </div>
                  </div>

                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 16 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, 100 - selected.count * 20)}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: '100%', background: `linear-gradient(90deg, ${strengthLabel(selected.count).color}, ${selected.color})`, borderRadius: 2 }}
                    />
                  </div>

                  <Link href={`/chat?q=${encodeURIComponent('Explain ' + selected.label + ' in detail with examples')}`} style={{ textDecoration: 'none' }}>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '11px', borderRadius: 14,
                        background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                        color: 'white', fontSize: 13, fontWeight: 700,
                        boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
                        cursor: 'pointer',
                      }}
                    >
                      <Brain size={14} /> Ask AI about this
                    </motion.div>
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
