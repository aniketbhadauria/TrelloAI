/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useBoards } from '../context/BoardContext';
import {
  // eslint-disable-next-line sonarjs/deprecation
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  BarChart3, Users, CheckCircle2, AlertTriangle, TrendingUp,
  ChevronDown, ArrowUpRight,
  Crown, Target, Award, PieChart as PieChartIcon,
  UserCheck, Layers, X,
} from 'lucide-react';
import { format, parseISO, startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';

/* ── Colour palette ──────────────────────────────────────────── */
const MEMBER_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
  '#a855f7', '#14b8a6', '#e879f9', '#fb923c',
  '#6366f1', '#22d3ee', '#84cc16', '#f43f5e',
];

const PIE_COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#10b981',
  '#f59e0b', '#f97316', '#06b6d4', '#ef4444',
  '#a855f7', '#14b8a6', '#e879f9', '#fb923c',
];

const STATUS_COLORS = {
  todo: '#f59e0b',
  inProgress: '#3b82f6',
  done: '#10b981',
  review: '#8b5cf6',
  other: '#94a3b8',
};

const STATUS_LABEL_MAP = {
  todo: 'To Do',
  inProgress: 'In Progress',
  done: 'Done',
  review: 'Review',
};

function formatStatusLabel(key) {
  return STATUS_LABEL_MAP[key] || 'Other';
}

/* ── Helpers ─────────────────────────────────────────────────── */
function getInitials(name) {
  const str = String(name ?? '').trim();
  if (!str) return '';
  return str.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function getMemberColor(name, idx) {
  if (idx !== undefined) return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.codePointAt(i) + ((hash << 5) - hash);
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

function classifyList(title) {
  const t = title.toLowerCase().trim();
  if (['done', 'completed', 'finished', 'shipped', 'deployed', 'closed', 'resolved'].some(k => t.includes(k))) return 'done';
  if (['in progress', 'doing', 'working', 'active', 'current', 'started'].some(k => t.includes(k))) return 'inProgress';
  if (['review', 'testing', 'qa', 'verify', 'staging'].some(k => t.includes(k))) return 'review';
  if (['to do', 'todo', 'backlog', 'planned', 'queue', 'upcoming', 'new', 'open'].some(k => t.includes(k))) return 'todo';
  return 'other';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueLabelsFromTaskItems(items) {
  const map = new Map();
  for (const it of items) {
    for (const lb of toArray(it?.labels)) {
      if (lb && (lb.id != null || lb.text) && !map.has(lb.id ?? lb.text)) {
        map.set(lb.id ?? lb.text, { id: lb.id ?? lb.text, text: lb.text || 'Label', color: lb.color || '#94a3b8' });
      }
    }
  }
  return [...map.values()];
}

function getBoardLists(board) {
  return toArray(board?.lists).length > 0 ? toArray(board.lists) : toArray(board?.columns);
}

function getListCards(list) {
  return toArray(list?.cards).length > 0 ? toArray(list.cards) : toArray(list?.tasks);
}

function getCardMembers(card) {
  return toArray(card?.members).length > 0 ? toArray(card.members) : toArray(card?.assignees);
}

function parseDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const asDate = new Date(value);
    return Number.isNaN(asDate.getTime()) ? null : asDate;
  }
  if (typeof value === 'string') {
    const parsedIso = parseISO(value);
    if (!Number.isNaN(parsedIso.getTime())) return parsedIso;
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  return null;
}

function emptyMemberStats() {
  return { total: 0, done: 0, inProgress: 0, todo: 0, review: 0, other: 0, overdue: 0, onTime: 0 };
}

function computeAvailabilityStatus(activeTasks, threshold) {
  if (activeTasks >= threshold * 1.5) return 'overloaded';
  if (activeTasks >= threshold) return 'busy';
  return 'available';
}

function getProgressStroke(progress) {
  if (progress >= 70) return '#10b981';
  if (progress >= 40) return '#f59e0b';
  return '#ef4444';
}

function getRankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-other';
}

/* ── Custom tooltip ──────────────────────────────────────────── */
function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}
    >
      {label && <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#374151' }}>{label}</p>}
      {payload.map((p) => (
        <div key={p.name ?? p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color || p.fill }} />
          <span style={{ color: '#6b7280' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#1f2937' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                        MAIN COMPONENT                         */
/* ═══════════════════════════════════════════════════════════════ */
export default function Analytics() {
  const { boards, boardsLoading } = useBoards();
  const [selectedBoardId, setSelectedBoardId] = useState('all');
  const [timeRange, setTimeRange] = useState(6);

  /* ── Derive analytics ────────────────────────────────────────── */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const analytics = useMemo(() => {
    const filteredBoards = selectedBoardId === 'all' ? boards : boards.filter(b => b.id === selectedBoardId);

    const allCards = [];
    const memberTasks = {};
    const memberActiveTasks = {};
    const monthlyDelivery = {};
    const statusCounts = { todo: 0, inProgress: 0, done: 0, review: 0, other: 0 };
    const cutoffDate = subMonths(new Date(), timeRange);

    for (const board of filteredBoards) {
      for (const list of getBoardLists(board)) {
        const listStatus = classifyList(list.title);
        for (const card of getListCards(list)) {
          allCards.push({ ...card, listTitle: list.title, listStatus, boardTitle: board.title });
          statusCounts[listStatus] = (statusCounts[listStatus] || 0) + 1;

          const members = getCardMembers(card);
          const cardDate = parseDateSafe(card.createdAt || card.created_at);
          const dueDate = parseDateSafe(card.dueDate || card.due_date);
          const isOverdue = dueDate && isBefore(dueDate, new Date()) && listStatus !== 'done';

          if (members.length === 0) {
            if (!memberTasks.Unassigned) memberTasks.Unassigned = emptyMemberStats();
            memberTasks.Unassigned.total++;
            memberTasks.Unassigned[listStatus]++;
            if (isOverdue) memberTasks.Unassigned.overdue++;
            if (listStatus === 'done') memberTasks.Unassigned.onTime++;
            if (listStatus !== 'done') {
              if (!memberActiveTasks.Unassigned) memberActiveTasks.Unassigned = [];
              memberActiveTasks.Unassigned.push({ title: card.title || 'Untitled task', labels: toArray(card.labels) });
            }
          }

          for (const member of members) {
            const name = member?.name;
            if (!name) continue;
            if (!memberTasks[name]) memberTasks[name] = emptyMemberStats();
            memberTasks[name].total++;
            memberTasks[name][listStatus]++;
            if (isOverdue) memberTasks[name].overdue++;
            if (listStatus === 'done') memberTasks[name].onTime++;
            if (listStatus !== 'done') {
              if (!memberActiveTasks[name]) memberActiveTasks[name] = [];
              memberActiveTasks[name].push({ title: card.title || 'Untitled task', labels: toArray(card.labels) });
            }

            if (listStatus === 'done' && cardDate && isAfter(cardDate, cutoffDate)) {
              const monthKey = format(startOfMonth(cardDate), 'MMM yyyy');
              if (!monthlyDelivery[monthKey]) monthlyDelivery[monthKey] = {};
              monthlyDelivery[monthKey][name] = (monthlyDelivery[monthKey][name] || 0) + 1;
            }
          }
        }
      }
    }

    const workloadData = Object.entries(memberTasks)
      .filter(([name]) => name !== 'Unassigned')
      .map(([name, stats]) => ({ name, value: stats.total, ...stats }))
      .sort((a, b) => b.value - a.value);

    const OVERLOAD_THRESHOLD = 5;
    const availabilityData = Object.entries(memberTasks)
      .filter(([name]) => name !== 'Unassigned')
      .map(([name, stats]) => {
        const activeTasks = stats.inProgress + stats.todo + stats.review;
        const status = computeAvailabilityStatus(activeTasks, OVERLOAD_THRESHOLD);
        return { name, activeTasks, activeTaskItems: memberActiveTasks[name] || [], ...stats, status };
      })
      .sort((a, b) => b.activeTasks - a.activeTasks);

    const monthKeys = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      monthKeys.push(format(startOfMonth(subMonths(new Date(), i)), 'MMM yyyy'));
    }
    const uniqueMembers = [...new Set(Object.keys(memberTasks).filter(n => n !== 'Unassigned'))];
    const monthlyBarData = monthKeys.map(monthKey => {
      const row = { month: monthKey.split(' ')[0] };
      for (const name of uniqueMembers) {
        row[name] = monthlyDelivery[monthKey]?.[name] || 0;
      }
      return row;
    });

    const statusData = Object.entries(statusCounts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: formatStatusLabel(key),
        value,
        color: STATUS_COLORS[key],
      }));

    const topPerformers = Object.entries(memberTasks)
      .filter(([name]) => name !== 'Unassigned')
      .map(([name, stats]) => ({
        name, completed: stats.done, total: stats.total,
        rate: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
        overdue: stats.overdue,
      }))
      .sort((a, b) => b.completed - a.completed);

    const totalCards = allCards.length;
    const totalMembers = uniqueMembers.length;
    const completionRate = totalCards > 0 ? Math.round((statusCounts.done / totalCards) * 100) : 0;
    const overdueCount = allCards.filter(c => {
      const due = parseDateSafe(c.dueDate || c.due_date);
      return due && isBefore(due, new Date()) && c.listStatus !== 'done';
    }).length;

    return { totalCards, totalMembers, completionRate, overdueCount, workloadData, availabilityData, monthlyBarData, statusData, topPerformers, uniqueMembers, memberTasks, unassignedCount: memberTasks.Unassigned?.total || 0, statusCounts };
  }, [boards, selectedBoardId, timeRange]);

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = analytics.totalCards > 0;

  return (
    <div className="analytics-page p-5 md:p-8 max-w-[1440px] mx-auto page-enter pb-16">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7 pt-3 relative z-10">
        <div>
          <p className="text-sm text-muted-foreground/70 mb-1 tracking-wide uppercase font-medium">Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Team{' '}
            <span className="bg-linear-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Performance
            </span>
            {' '}✨
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track workload, delivery, and team availability in real-time</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select id="board-selector" value={selectedBoardId} onChange={e => setSelectedBoardId(e.target.value)} className="glass-select">
              <option value="all">All Boards</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select id="time-range-selector" value={timeRange} onChange={e => setTimeRange(Number(e.target.value))} className="glass-select">
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="space-y-5 relative z-10">
          {/* ═══ Row 1: KPI Stats inside a parent glass card ═══ */}
          <div className="glass-card shimmer-on-hover">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <KPICard
                icon={<Target className="w-4 h-4" />}
                gradient="linear-gradient(135deg, #ec4899, #f43f5e)"
                kpiClass="kpi-pink"
                label="Total Tasks"
                value={analytics.totalCards}
                sub={`${analytics.unassignedCount} unassigned`}
                progress={null}
              />
              <KPICard
                icon={<Users className="w-4 h-4" />}
                gradient="linear-gradient(135deg, #8b5cf6, #6366f1)"
                kpiClass="kpi-purple"
                label="Team Members"
                value={analytics.totalMembers}
                sub="active contributors"
                progress={null}
              />
              <KPICard
                icon={<CheckCircle2 className="w-4 h-4" />}
                gradient="linear-gradient(135deg, #10b981, #059669)"
                kpiClass="kpi-green"
                label="Completion Rate"
                value={`${analytics.completionRate}%`}
                sub="tasks completed"
                progress={analytics.completionRate}
              />
              <KPICard
                icon={<AlertTriangle className="w-4 h-4" />}
                gradient="linear-gradient(135deg, #f59e0b, #f97316)"
                kpiClass="kpi-amber"
                label="Overdue"
                value={analytics.overdueCount}
                sub="need attention"
                progress={null}
              />
            </div>
          </div>

          {/* ═══ Row 2: Bento — Workload Pie + Status Pie ═══ */}
          <div className="bento-grid">
            {/* Workload Distribution */}
            <div className="glass-card bento-span-7">
              <SectionHeader icon={<PieChartIcon className="w-4 h-4" />} gradient="linear-gradient(135deg, #ec4899, #8b5cf6)" title="Workload Distribution" sub="Tasks assigned per member" />
              {analytics.workloadData.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <div className="w-full lg:w-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={analytics.workloadData} cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={900} strokeWidth={0}>
                          {/* eslint-disable-next-line sonarjs/deprecation */}
                          {analytics.workloadData.map((d, i) => <Cell key={d.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<GlassTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend — 2-column clean list */}
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-2.5 max-h-[200px] overflow-y-auto self-center pr-1">
                    {analytics.workloadData.map((d, i) => (
                      <div key={d.name} className="flex items-start gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate leading-tight">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.value} tasks</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyPanel message="Assign members to cards to see workload distribution" />
              )}
            </div>

            {/* Task Status */}
            <div className="glass-card bento-span-5">
              <SectionHeader icon={<Layers className="w-4 h-4" />} gradient="linear-gradient(135deg, #3b82f6, #06b6d4)" title="Task Status" sub="Workflow stages" />
              {analytics.statusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={analytics.statusData} cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={4} dataKey="value" animationBegin={200} animationDuration={800} strokeWidth={0}>
                        {/* eslint-disable-next-line sonarjs/deprecation */}
                        {analytics.statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<GlassTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Status legend row */}
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {analytics.statusData.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-[10px] opacity-70">({s.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyPanel message="No tasks found" />
              )}
            </div>
          </div>

          {/* ═══ Row 3: Team Availability ═══ */}
          <div className="glass-card">
            <SectionHeader icon={<UserCheck className="w-4 h-4" />} gradient="linear-gradient(135deg, #f59e0b, #f97316)" title="Team Availability & Workload" sub="Who is overloaded and who has bandwidth for more work" />
            {analytics.availabilityData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {analytics.availabilityData.map((member, i) => (
                  <MemberCard key={member.name} member={member} index={i} />
                ))}
              </div>
            ) : (
              <EmptyPanel message="Assign members to cards to track availability" />
            )}
          </div>

          {/* ═══ Row 4: Bento — Monthly Delivery + Top Performers ═══ */}
          <div className="bento-grid">
            {/* Monthly Delivery */}
            <div className="glass-card bento-span-8">
              <SectionHeader icon={<TrendingUp className="w-4 h-4" />} gradient="linear-gradient(135deg, #10b981, #14b8a6)" title="Monthly Delivery" sub="Completed tasks per member over time" />
              {analytics.uniqueMembers.length > 0 && analytics.monthlyBarData.some(r => Object.values(r).some(v => typeof v === 'number' && v > 0)) ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.monthlyBarData} barGap={2} barCategoryGap="18%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<GlassTooltip />} />
                      {analytics.uniqueMembers.map((name, i) => (
                        <Bar key={name} dataKey={name} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[6, 6, 0, 0]} animationBegin={i * 80} animationDuration={700} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Compact legend */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                    {analytics.uniqueMembers.map((name, i) => (
                      <div key={name} className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[10px] text-muted-foreground truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyPanel message="Complete tasks (move to 'Done' list) to see monthly delivery trends" />
              )}
            </div>

            {/* Top Performers */}
            <div className="glass-card bento-span-4">
              <SectionHeader icon={<Award className="w-4 h-4" />} gradient="linear-gradient(135deg, #fbbf24, #f97316)" title="Top Performers" sub="Ranked by delivery" />
              {analytics.topPerformers.length > 0 ? (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 -mr-1">
                  {analytics.topPerformers.map((member, i) => (
                    <PerformerRow key={member.name} member={member} rank={i + 1} />
                  ))}
                </div>
              ) : (
                <EmptyPanel message="No members found" />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-pink-100 to-purple-100 flex items-center justify-center mb-5">
            <BarChart3 className="w-10 h-10 text-pink-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No data to analyze yet</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Start adding cards with assigned members to your boards and you&apos;ll see workload distribution, performance metrics, and delivery trends here.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                       SUB-COMPONENTS                          */
/* ═══════════════════════════════════════════════════════════════ */

/* ── Section heading ─────────────────────────────────────────── */
function SectionHeader({ icon, gradient, title, sub }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="glass-icon-badge" style={{ background: gradient }}>{icon}</div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>
      </div>
    </div>
  );
}

/* ── KPI Card with radial SVG ring ───────────────────────────── */
function KPICard({ icon, gradient, kpiClass, label, value, sub, progress }) {
  const r = 15;
  const vb = 34;
  const c = 2 * Math.PI * r;
  const hasProgress = progress != null;
  const offset = hasProgress ? c - (progress / 100) * c : c;
  const cx = vb / 2;

  return (
    <div className={`glass-kpi ${kpiClass} cursor-default`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-md [&_svg]:shrink-0" style={{ background: gradient }}>
          {icon}
        </div>
        {hasProgress ? (
          <svg width="32" height="32" viewBox={`0 0 ${vb} ${vb}`} className="-rotate-90 shrink-0">
            <circle className="radial-progress-bg" cx={cx} cy={cx} r={r} strokeWidth="3" />
            <circle className="radial-progress-fill" cx={cx} cy={cx} r={r} strokeWidth="3" stroke={getProgressStroke(progress)} strokeDasharray={c} strokeDashoffset={offset} />
          </svg>
        ) : (
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        )}
      </div>
      <p className="text-lg sm:text-xl font-bold tracking-tight leading-none tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold text-foreground/80 mt-1 leading-tight">{label}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{sub}</p>
    </div>
  );
}

/* ── Member Tasks Modal ──────────────────────────────────────── */
function MemberTasksModal({ member, onClose }) {
  const dialogRef = useRef(null);

  // Open as native modal (focus-trapping, backdrop, Escape) when available.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (typeof el.showModal === 'function') {
      el.showModal();
    }
    return () => {
      if (typeof el.close === 'function') el.close();
    };
  }, []);

  // Close on Escape for browsers that don't fire the native cancel event.
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus-trap fallback for browsers without showModal support.
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.disabled);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      onCancel={onClose}
      className="modal-overlay z-50 bg-transparent p-0 m-0 max-w-none max-h-none w-full h-full inset-0"
      aria-labelledby="member-tasks-title"
    >
      <button
        type="button"
        className="absolute inset-0 w-full h-full bg-transparent cursor-default"
        onClick={onClose}
        aria-label="Close tasks modal"
      />
      <div
        className="modal-content relative bg-card border border-border rounded-2xl p-5 w-full max-w-md max-h-[min(70vh,420px)] flex flex-col shadow-2xl mx-4"
      >
        <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
          <div className="min-w-0">
            <h2 id="member-tasks-title" className="text-base font-semibold leading-tight truncate">
              {member.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">All active tasks assigned to this member</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto pr-1 text-sm -mr-1">
          {(member.activeTaskItems || []).map((it, i) => (
            <li key={`${member.name}-task-${i}-${it.title}`} className="flex gap-2 text-foreground/90 leading-snug">
              <span className="text-muted-foreground shrink-0 tabular-nums w-5">{i + 1}.</span>
              <span className="wrap-break-word min-w-0">{it.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}

/* ── Member availability card ────────────────────────────────── */
const STATUS_CONFIG = {
  overloaded: { label: 'Overloaded', pillCls: 'pill-red', dotColor: '#ef4444', barColor: '#ef4444' },
  busy:       { label: 'Busy',       pillCls: 'pill-amber', dotColor: '#f59e0b', barColor: '#f59e0b' },
  available:  { label: 'Available',  pillCls: 'pill-green', dotColor: '#10b981', barColor: '#10b981' },
};

function MemberCard({ member, index }) {
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const cfg = STATUS_CONFIG[member.status];

  const maxTasks = 10;
  const pct = Math.min((member.activeTasks / maxTasks) * 100, 100);
  const items = member.activeTaskItems || [];
  const labelChips = uniqueLabelsFromTaskItems(items);
  const hasOnlyUnlabeled = items.length > 0 && labelChips.length === 0;

  return (
    <>
      <div className="glass-inner hover:scale-[1.02] transition-transform duration-300 cursor-default">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ring-2 ring-white/50" style={{ backgroundColor: getMemberColor(member.name, index) }}>
            {getInitials(member.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{member.name}</p>
            <div className={`availability-pill ${cfg.pillCls} mt-1`}>
              <div className="pill-dot" style={{ backgroundColor: cfg.dotColor }} />
              {cfg.label}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Active tasks</span>
            <span className="font-bold text-foreground">{member.activeTasks}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: cfg.barColor }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {member.done} done</span>
            <span className="flex items-center gap-1">{member.overdue > 0 && <AlertTriangle className="w-3 h-3 text-red-400" />}{member.overdue} overdue</span>
          </div>
          {items.length > 0 && (
            <div className="mt-2 border-t border-border/40 pt-2">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Working on:</p>
              <div className="flex flex-wrap gap-1.5">
                {hasOnlyUnlabeled ? (
                  <button
                    type="button"
                    onClick={() => setTasksModalOpen(true)}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-md border border-border/60 bg-background/80 hover:bg-secondary/80 transition-colors text-foreground/90"
                  >
                    {items.length} active task{items.length === 1 ? '' : 's'}
                  </button>
                ) : (
                  labelChips.map((label) => (
                    <button
                      type="button"
                      key={String(label.id)}
                      onClick={() => setTasksModalOpen(true)}
                      className="text-[10px] font-medium px-2.5 py-0.5 rounded-md text-white shadow-sm max-w-full truncate transition-opacity hover:opacity-90"
                      style={{ backgroundColor: label.color }}
                      title={label.text}
                    >
                      {label.text}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {tasksModalOpen && (
        <MemberTasksModal member={member} onClose={() => setTasksModalOpen(false)} />
      )}
    </>
  );
}

/* ── Top performer row ───────────────────────────────────────── */
function PerformerRow({ member, rank }) {
  const rankCls = getRankClass(rank);
  const rankLabel = rank <= 3 ? <Crown className="w-3.5 h-3.5" /> : `#${rank}`;

  return (
    <div className="glass-inner flex items-center gap-3 p-3! rounded-xl! hover:scale-[1.01] transition-transform duration-200 cursor-default">
      <div className={`rank-badge ${rankCls}`}>{rankLabel}</div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: getMemberColor(member.name) }}>
        {getInitials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{member.name}</p>
        <p className="text-[10px] text-muted-foreground">{member.completed} done · {member.total} total</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">{member.rate}%</p>
      </div>
    </div>
  );
}

/* ── Empty placeholder ───────────────────────────────────────── */
function EmptyPanel({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(0,0,0,0.03)' }}>
        <BarChart3 className="w-5 h-5 text-muted-foreground/40" />
      </div>
      <p className="text-xs text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}
