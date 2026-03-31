import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Minus, Maximize2, Sparkles, Trash2, Edit3,
  ChevronRight, ChevronDown, X, Loader2, Brain, RotateCcw,
} from 'lucide-react';

const BRANCH_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];
const ROOT_W = 200, ROOT_H = 50, NODE_H = 40, H_GAP = 60, V_GAP = 14;

function getNodeW(depth) { return Math.max(160 - depth * 8, 110); }

function findNode(root, id) {
  if (root.id === id) return root;
  for (const c of root.children || []) { const f = findNode(c, id); if (f) return f; }
  return null;
}

function updateTree(node, id, fn) {
  if (node.id === id) return fn(node);
  return { ...node, children: (node.children || []).map(c => updateTree(c, id, fn)) };
}

function removeFromTree(node, id) {
  return { ...node, children: (node.children || []).filter(c => c.id !== id).map(c => removeFromTree(c, id)) };
}

function assignColors(root) {
  return {
    ...root, id: root.id || crypto.randomUUID(), color: '#8b5cf6',
    children: (root.children || []).map((c, i) => colorBranch(c, BRANCH_COLORS[i % BRANCH_COLORS.length])),
  };
}
function colorBranch(node, color) {
  return { ...node, id: node.id || crypto.randomUUID(), color, children: (node.children || []).map(c => colorBranch(c, color)) };
}

function subtreeH(node) {
  if (node._collapsed || !node.children?.length) return NODE_H;
  const ch = node.children.reduce((s, c) => s + subtreeH(c), 0) + (node.children.length - 1) * V_GAP;
  return Math.max(NODE_H, ch);
}

function layoutBranch(nodes, startX, dir, pos, depth) {
  if (!nodes.length) return;
  const totalH = nodes.reduce((s, n) => s + subtreeH(n), 0) + (nodes.length - 1) * V_GAP;
  let y = -totalH / 2;
  const w = getNodeW(depth);
  for (const node of nodes) {
    const stH = subtreeH(node);
    pos.set(node.id, { x: startX, y: y + stH / 2 - NODE_H / 2, w, h: NODE_H, color: node.color, dir });
    if (node.children?.length && !node._collapsed) {
      const cw = getNodeW(depth + 1);
      const cx = dir > 0 ? startX + w + H_GAP : startX - cw - H_GAP;
      layoutBranch(node.children, cx, dir, pos, depth + 1);
    }
    y += stH + V_GAP;
  }
}

function layoutMindmap(root) {
  const pos = new Map();
  pos.set(root.id, { x: -ROOT_W / 2, y: -ROOT_H / 2, w: ROOT_W, h: ROOT_H, color: root.color || '#8b5cf6', dir: 0 });
  if (!root.children?.length || root._collapsed) return pos;
  const mid = Math.ceil(root.children.length / 2);
  layoutBranch(root.children.slice(0, mid), ROOT_W / 2 + H_GAP, 1, pos, 1);
  layoutBranch(root.children.slice(mid), -(ROOT_W / 2 + H_GAP + getNodeW(1)), -1, pos, 1);
  return pos;
}

function bezier(p, c) {
  const dir = c.x > p.x + p.w / 2 ? 1 : -1;
  const x1 = dir > 0 ? p.x + p.w : p.x;
  const y1 = p.y + p.h / 2;
  const x2 = dir > 0 ? c.x : c.x + c.w;
  const y2 = c.y + c.h / 2;
  const cp = Math.abs(x2 - x1) * 0.45;
  return `M${x1} ${y1} C${x1 + dir * cp} ${y1},${x2 - dir * cp} ${y2},${x2} ${y2}`;
}

function collectConns(node, pos) {
  const conns = [];
  if (node._collapsed || !node.children?.length) return conns;
  const pp = pos.get(node.id);
  for (const child of node.children) {
    const cp = pos.get(child.id);
    if (pp && cp) conns.push({ d: bezier(pp, cp), color: child.color || '#666' });
    conns.push(...collectConns(child, pos));
  }
  return conns;
}

const DEFAULT_MAP = { id: 'root', text: 'My Mind Map', color: '#8b5cf6', children: [] };

export default function MindMapView() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0 });
  const zoomRef = useRef(1);

  const [mapData, setMapData] = useState(() => {
    try { const s = localStorage.getItem('taskflow_mindmap'); return s ? JSON.parse(s) : DEFAULT_MAP; }
    catch { return DEFAULT_MAP; }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showAI, setShowAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  zoomRef.current = zoom;

  useEffect(() => { localStorage.setItem('taskflow_mindmap', JSON.stringify(mapData)); }, [mapData]);

  useEffect(() => {
    if (canvasRef.current && !initialized) {
      const { width, height } = canvasRef.current.getBoundingClientRect();
      setPan({ x: width / 2, y: height / 2 });
      setInitialized(true);
    }
  }, [initialized]);

  const positions = useMemo(() => layoutMindmap(mapData), [mapData]);
  const connections = useMemo(() => collectConns(mapData, positions), [mapData, positions]);

  const addChild = useCallback((parentId) => {
    const newId = crypto.randomUUID();
    setMapData(prev => {
      const parent = findNode(prev, parentId);
      const color = parentId === prev.id
        ? BRANCH_COLORS[prev.children.length % BRANCH_COLORS.length]
        : parent?.color || '#8b5cf6';
      return updateTree(prev, parentId, n => ({
        ...n, _collapsed: false,
        children: [...(n.children || []), { id: newId, text: 'New topic', children: [], color }],
      }));
    });
    setSelectedId(newId);
    setEditingId(newId);
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setMapData(prev => (nodeId === prev.id ? prev : removeFromTree(prev, nodeId)));
    setSelectedId(prev => prev === nodeId ? null : prev);
  }, []);

  const updateText = useCallback((nodeId, text) => {
    if (!text.trim()) return setEditingId(null);
    setMapData(prev => updateTree(prev, nodeId, n => ({ ...n, text: text.trim() })));
    setEditingId(null);
  }, []);

  const toggleCollapse = useCallback((nodeId) => {
    setMapData(prev => (nodeId === prev.id ? prev : updateTree(prev, nodeId, n => ({ ...n, _collapsed: !n._collapsed }))));
  }, []);

  const fitView = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, p] of positions) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h);
    }
    const cw = maxX - minX + 120, ch = maxY - minY + 120;
    const nz = Math.min(Math.max(Math.min(rect.width / cw, rect.height / ch), 0.2), 1.5);
    setZoom(nz);
    setPan({ x: rect.width / 2 - ((minX + maxX) / 2) * nz, y: rect.height / 2 - ((minY + maxY) / 2) * nz });
  }, [positions]);

  const handleGenerate = async () => {
    if (!aiTopic.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/mindmap/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic.trim() }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setMapData(assignColors(data));
      setShowAI(false); setAiTopic(''); setSelectedId(null);
      setTimeout(fitView, 150);
    } catch (e) { console.error(e); }
    finally { setAiLoading(false); }
  };

  const resetMap = () => { setMapData(DEFAULT_MAP); setSelectedId(null); setEditingId(null); };

  // Pan handlers
  const handleCanvasDown = (e) => {
    if (e.button !== 0 || e.target.closest('.mm-node') || e.target.closest('.mm-toolbar')) return;
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, spx: pan.x, spy: pan.y };
  };
  useEffect(() => {
    const move = (e) => {
      if (!dragRef.current.active) return;
      setPan({ x: dragRef.current.spx + e.clientX - dragRef.current.sx, y: dragRef.current.spy + e.clientY - dragRef.current.sy });
    };
    const up = () => { dragRef.current.active = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  // Zoom handler
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.93 : 1.07;
      const prev = zoomRef.current;
      const nz = Math.min(Math.max(prev * factor, 0.15), 3);
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      setPan(p => ({ x: mx - (mx - p.x) * (nz / prev), y: my - (my - p.y) * (nz / prev) }));
      setZoom(nz);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (editingId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) deleteNode(selectedId);
      if (e.key === 'Tab' && selectedId) { e.preventDefault(); addChild(selectedId); }
      if (e.key === 'Enter' && selectedId) setEditingId(selectedId);
      if (e.key === 'Escape') { setSelectedId(null); setShowAI(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, editingId, addChild, deleteNode]);

  const selectedPos = selectedId ? positions.get(selectedId) : null;

  const renderNode = (node) => {
    const p = positions.get(node.id);
    if (!p) return null;
    const isRoot = node.id === mapData.id;
    const isSelected = node.id === selectedId;
    const isEditing = node.id === editingId;
    const hasChildren = node.children?.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`mm-node absolute cursor-pointer transition-shadow duration-200 ${
            isRoot
              ? 'rounded-2xl border-2 shadow-lg'
              : 'rounded-xl border shadow-md'
          } ${isSelected ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-transparent' : ''}`}
          style={{
            left: p.x, top: p.y, width: p.w, height: p.h,
            background: isRoot
              ? `linear-gradient(135deg, ${p.color}22, ${p.color}11)`
              : '#1E1F23',
            borderColor: isRoot ? `${p.color}66` : `${p.color}44`,
            borderLeftWidth: isRoot ? 2 : 3,
            borderLeftColor: p.color,
          }}
          onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
          onDoubleClick={(e) => { e.stopPropagation(); setEditingId(node.id); }}
        >
          <div className="flex items-center h-full px-3 gap-2">
            {hasChildren && !isRoot && (
              <button
                className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors text-gray-500"
                onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              >
                {node._collapsed
                  ? <ChevronRight className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            {isEditing ? (
              <input
                autoFocus
                defaultValue={node.text}
                className="bg-transparent outline-none text-sm w-full text-white font-medium"
                onBlur={(e) => updateText(node.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateText(node.id, e.target.value);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`truncate select-none ${
                isRoot ? 'text-sm font-bold text-white' : 'text-[13px] font-medium text-gray-200'
              }`}>{node.text}</span>
            )}
            {node._collapsed && hasChildren && (
              <span className="shrink-0 text-[9px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full">
                {node.children.length}
              </span>
            )}
          </div>
        </div>
        {!node._collapsed && node.children?.map(c => renderNode(c))}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-[#0E0F11]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#141517]/80 backdrop-blur-xl shrink-0 z-20">
        <button onClick={() => navigate('/boards')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Boards
        </button>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-gray-200">Mind Map</span>
        </div>
        <div className="flex-1" />

        <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <button onClick={() => setZoom(z => Math.max(z * 0.85, 0.15))} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-gray-500 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z * 1.15, 3))} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={fitView} className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors" title="Fit view">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button onClick={resetMap} className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors" title="Reset">
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/10" />
        <button
          onClick={() => setShowAI(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30 text-sm font-medium text-violet-300 hover:text-white hover:border-violet-500/50 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          AI Generate
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: dragRef.current.active ? 'grabbing' : 'grab',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        onMouseDown={handleCanvasDown}
        onClick={(e) => { if (!e.target.closest('.mm-node') && !e.target.closest('.mm-toolbar')) setSelectedId(null); }}
      >
        {/* Transformed layer */}
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute' }}>
          <svg style={{ position: 'absolute', overflow: 'visible', width: 1, height: 1, pointerEvents: 'none' }}>
            {connections.map((c, i) => (
              <path key={i} d={c.d} fill="none" stroke={c.color} strokeWidth={2} strokeOpacity={0.35} strokeLinecap="round" />
            ))}
          </svg>
          {renderNode(mapData)}
        </div>

        {/* Selected node toolbar (outside transform for consistent size) */}
        <AnimatePresence>
          {selectedPos && selectedId && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mm-toolbar absolute z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-[#252629]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl"
              style={{
                left: (selectedPos.x + selectedPos.w / 2) * zoom + pan.x,
                top: selectedPos.y * zoom + pan.y - 42,
                transform: 'translateX(-50%)',
              }}
            >
              <button onClick={() => addChild(selectedId)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors" title="Add child (Tab)">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingId(selectedId)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors" title="Edit (Enter)">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              {selectedId !== mapData.id && (
                <>
                  {findNode(mapData, selectedId)?.children?.length > 0 && (
                    <button onClick={() => toggleCollapse(selectedId)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-colors" title="Collapse/Expand">
                      {findNode(mapData, selectedId)?._collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <div className="w-px h-4 bg-white/10 mx-0.5" />
                  <button onClick={() => deleteNode(selectedId)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="Delete (Del)">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state hint */}
        {!mapData.children?.length && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center mt-24 pointer-events-auto">
              <p className="text-sm text-gray-500 mb-3">Double-click the root to rename, or</p>
              <button
                onClick={() => setShowAI(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-sm text-violet-300 hover:bg-violet-500/20 transition-colors mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Generation Panel */}
      <AnimatePresence>
        {showAI && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => !aiLoading && setShowAI(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-4 top-[72px] bottom-4 w-[380px] z-50 flex flex-col rounded-2xl bg-[#1A1B1E]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            >
              {/* Panel header - macOS style */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">AI Mind Map</h3>
                    <p className="text-[11px] text-gray-500">Generate from any topic</p>
                  </div>
                </div>
                <button onClick={() => !aiLoading && setShowAI(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Topic</label>
                  <input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="e.g. Machine Learning, Project Planning..."
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 outline-none focus:border-violet-500/50 transition-colors"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!aiTopic.trim() || aiLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-sm font-semibold text-white hover:from-violet-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
                >
                  {aiLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Mind Map</>
                  )}
                </button>

                <div className="flex-1" />

                {/* Quick topics */}
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 block">Quick Start</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Project Planning', 'SWOT Analysis', 'Marketing Strategy', 'App Architecture', 'Study Notes', 'Business Model'].map(t => (
                      <button
                        key={t}
                        onClick={() => setAiTopic(t)}
                        className="text-left px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shortcuts */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 font-medium">Shortcuts</p>
                  <div className="space-y-1.5">
                    {[
                      ['Tab', 'Add child node'],
                      ['Enter', 'Edit selected'],
                      ['Delete', 'Remove node'],
                      ['Esc', 'Deselect'],
                      ['Scroll', 'Zoom in/out'],
                    ].map(([key, desc]) => (
                      <div key={key} className="flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-gray-500 font-mono min-w-[44px] text-center">{key}</kbd>
                        <span className="text-[11px] text-gray-600">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
