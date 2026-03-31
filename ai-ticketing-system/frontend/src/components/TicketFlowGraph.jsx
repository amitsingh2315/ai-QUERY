/**
 * TicketFlowGraph — Pure CSS horizontal flowchart (no React Flow canvas scaling issues)
 * Nodes are always full size, layout scrolls horizontally if needed.
 * Logic is 100% identical — only rendering approach changed.
 */
import React from 'react';

/* ─── Helpers ──────────────────────────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

/* ─── Design tokens per status ─────────────────────────────────── */
const TOKEN = {
  done:    { border: '#22c55e', bg: '#171717', label: '#22c55e', sub: '#e2e8f0', glow: 'none', badge: '#22c55e' },
  active:  { border: '#3b82f6', bg: '#171717', label: '#3b82f6', sub: '#e2e8f0', glow: 'none', badge: '#3b82f6' },
  pending: { border: '#2a2a2a', bg: '#0f0f0f', label: '#A1A1A1', sub: '#A1A1A1', glow: 'none', badge: '#2a2a2a' },
  skipped: { border: '#171717', bg: '#0f0f0f', label: '#525252', sub: '#525252', glow: 'none', badge: '#171717' },
};

/* ─── Step Card ─────────────────────────────────────────────────── */
function Card({ icon, title, sub, ts, status, stepNum }) {
  const t = TOKEN[status] || TOKEN.pending;
  const isDone   = status === 'done';
  const isActive = status === 'active';
  const isSkipped = status === 'skipped';

  return (
    <div style={{
      width: 145,
      minHeight: 100,
      flexShrink: 0,
      background: t.bg,
      border: `2px solid ${t.border}`,
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: t.glow,
      position: 'relative',
      transition: 'all 0.35s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      opacity: isSkipped ? 0.35 : 1,
    }}>
      {/* Step badge */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: t.badge + '28',
        border: `1px solid ${t.badge}`,
        borderRadius: 99,
        width: 20, height: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color: t.label,
      }}>
        {isDone ? '✓' : isActive ? '●' : stepNum}
      </div>

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 24 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: t.label, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>
          {title}
        </span>
      </div>

      {/* Dynamic data */}
      {sub && (
        <div style={{ fontSize: 13, fontWeight: 800, color: isDone || isActive ? '#f8fafc' : '#475569', lineHeight: 1.4, marginTop: 4 }}>
          {sub}
        </div>
      )}

      {/* Divider */}
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: t.border + '50', margin: '6px 0 5px' }} />

      {/* Timestamp / status label */}
      <div style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
        {ts ? <><span>⏱</span><span>{ts}</span></> :
         isDone ? <span style={{ color: '#10b981' }}>✓ Completed</span> :
         isActive ? <span style={{ color: '#818cf8' }}>⟳ In Progress…</span> :
         <span>Waiting…</span>}
      </div>
    </div>
  );
}

/* ─── Diamond Decision Node ─────────────────────────────────────── */
function Diamond({ status }) {
  const t = TOKEN[status] || TOKEN.pending;
  return (
    <div style={{ position: 'relative', width: 96, height: 64, flexShrink: 0 }}>
      <svg width="96" height="64">
        <defs>
          <filter id="dg"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
        </defs>
        <polygon
          points="48,4 92,32 48,60 4,32"
          fill={t.bg}
          stroke={t.border}
          strokeWidth="2"
          style={{ filter: 'none', transition: 'all 0.35s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      }}>
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ fontSize: 8.5, fontWeight: 800, color: t.label, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
          Auto<br />Resolve?
        </span>
      </div>
    </div>
  );
}

/* ─── Arrow connector ───────────────────────────────────────────── */
function Arrow({ active, label, vertical = false }) {
  const color = active ? '#22c55e' : '#334155';
  if (vertical) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 36, flexShrink: 0, justifyContent: 'center', gap: 2 }}>
        {label && <span style={{ fontSize: 8, fontWeight: 700, color: active ? '#34d399' : '#475569', background: '#0d1424', padding: '1px 5px', borderRadius: 3, border: `1px solid ${color}` }}>{label}</span>}
        <svg width="12" height={label ? 18 : 28} style={{ display: 'block' }}>
          <line x1="6" y1="0" x2="6" y2={label ? 13 : 22} stroke={color} strokeWidth="2" />
          <polygon points="6,26 2,16 10,16" fill={color} transform={label ? 'translate(0,-8)' : ''} />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center', flexShrink: 0, width: 32, gap: 2 }}>
      {label && (
        <span style={{ fontSize: 8, fontWeight: 700, color: active ? '#22c55e' : '#475569', background: '#0f0f0f', padding: '1px 5px', borderRadius: 3, border: `1px solid ${color}`, whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <svg width="32" height="12">
        <line x1="0" y1="6" x2="23" y2="6" stroke={color} strokeWidth={active ? 2.5 : 1.5} strokeDasharray={active ? 'none' : '4 3'} />
        <polygon points="32,6 22,2 22,10" fill={color} />
      </svg>
    </div>
  );
}

/* ─── Availability Card ─────────────────────────────────────────── */
function AvailCard({ availability, ts }) {
  const avMap = {
    Available: { color: '#22c55e', icon: '🟢', bg: '#171717', border: '#22c55e', glow: 'none' },
    Busy:      { color: '#facc15', icon: '🟠', bg: '#171717', border: '#facc15', glow: 'none' },
    'On Leave':{ color: '#A1A1A1', icon: '⚫', bg: '#171717', border: '#2a2a2a', glow: 'none' },
  };
  const c = avMap[availability] || { color: '#334155', icon: '⚪', bg: 'rgba(15,23,42,0.7)', border: '#334155', glow: 'none' };

  return (
    <div style={{
      width: 145, minHeight: 100, flexShrink: 0,
      background: c.bg, border: `2px solid ${c.border}`,
      borderRadius: 12, padding: '10px 14px',
      boxShadow: c.glow, display: 'flex', flexDirection: 'column', gap: 4,
      transition: 'all 0.35s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>👤</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Availability
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: c.color, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 14 }}>{c.icon}</span>
        <span>{availability || 'Unknown'}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: c.border + '50', margin: '4px 0 5px' }} />
      <div style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
        {ts ? <><span>⏱</span><span>{ts}</span></> : <span>Pending assignment…</span>}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function TicketFlowGraph({ ticket }) {
  if (!ticket) return null;

  const wentAuto    = ticket.auto_resolved || !!ticket.auto_response;
  const failedAuto  = wentAuto && ticket.assignee_id != null;
  const wentHuman   = !wentAuto || failedAuto;
  const hasAssignee = !!ticket.assignee_id;
  const isResolved  = ticket.status === 'Resolved' || ticket.status === 'Closed';
  const isClosed    = ticket.status === 'Closed';

  const s = (done, active = false, skipped = false) =>
    skipped ? 'skipped' : done ? 'done' : active ? 'active' : 'pending';

  const decisionStatus = s(!!ticket.category, false);

  return (
    <div style={{
      background: '#0F0F0F',
      borderRadius: 14,
      border: '1px solid #2a2a2a',
      padding: '14px 16px 16px',
      overflowX: 'auto',
      overflowY: 'visible',
    }}>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, justifyContent: 'flex-end' }}>
        {[['#22c55e','Completed'], ['#3b82f6','In Progress'], ['#A1A1A1','Pending']].map(([color, lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 9.5, fontWeight: 600, color: '#A1A1A1' }}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* ── Main horizontal flow row ── */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', position: 'relative' }}>

        {/* 1. Raise Ticket */}
        <Card
          icon="🎫" title="Raise Ticket"
          sub={`Ticket #${ticket.id}`}
          ts={fmt(ticket.created_at)}
          status="done" stepNum="1"
        />

        <Arrow active={true} />

        {/* 2. Department */}
        <Card
          icon="🏢" title="Department"
          sub={ticket.category || ticket.department || 'Detecting…'}
          ts={fmt(ticket.updated_at)}
          status={s(!!ticket.category, !ticket.category)}
          stepNum="2"
        />

        <Arrow active={!!ticket.category} />

        {/* 3. Auto Resolve Decision Diamond */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
          <Diamond status={decisionStatus} />

          {/* YES branch label going down */}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 0 }}>
            <Arrow active={wentAuto && !failedAuto} label="YES" vertical />
            {/* Auto Resolve Card */}
            <Card
              icon="✨" title="Auto Resolve"
              sub={wentAuto && !failedAuto ? 'AI Resolved ✓' : 'Not Triggered'}
              ts={wentAuto && !failedAuto ? fmt(ticket.updated_at) : null}
              status={s(wentAuto && !failedAuto, false, !wentAuto || failedAuto)}
              stepNum="3a"
            />
          </div>
        </div>

        {/* NO arrow from diamond to Assign */}
        <Arrow active={wentHuman} label="NO" />

        {/* 4. Assign Employee */}
        <Card
          icon="👤" title="Assign Employee"
          sub={
            hasAssignee ? (
              <span style={{ color: '#a855f7', fontWeight: 900, textShadow: '0 0 10px rgba(168,85,247,0.3)', letterSpacing: '0.02em', fontSize: 14 }}>
                {ticket.assignee_name || `Agent #${ticket.assignee_id}`}
              </span>
            ) : wentHuman ? 'Routing…' : 'N/A'
          }
          ts={fmt(ticket.assigned_at)}
          status={s(hasAssignee && wentHuman, wentHuman && !hasAssignee, !wentHuman)}
          stepNum="4"
        />

        <Arrow active={hasAssignee && wentHuman} />

        {/* 5. Availability */}
        <AvailCard
          availability={hasAssignee ? (ticket.assignee_availability || 'Available') : null}
          ts={fmt(ticket.assigned_at)}
        />

        <Arrow active={hasAssignee && wentHuman} />

        {/* 6. Resolve */}
        <Card
          icon="🔧" title="Resolve Ticket"
          sub={isResolved ? 'Resolved ✓' : hasAssignee && wentHuman ? 'Pending…' : 'Waiting'}
          ts={fmt(ticket.resolved_at)}
          status={s(isResolved, hasAssignee && wentHuman && !isResolved, !wentHuman && !wentAuto)}
          stepNum="6"
        />

        <Arrow active={isResolved} />

        {/* 7. Close */}
        <Card
          icon="✅" title="Close Ticket"
          sub={isClosed ? 'Closed ✓' : isResolved ? 'Awaiting Close' : 'Pending'}
          ts={isClosed ? fmt(ticket.updated_at) : null}
          status={s(isClosed, isResolved && !isClosed)}
          stepNum="7"
        />
      </div>

      {/* Spacer for the auto-branch cards below */}
      <div style={{ height: 130 }} />

      {/* ── Scroll hint ── */}
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10.5, color: '#334155' }}>← scroll to see all steps →</span>
      </div>
    </div>
  );
}
