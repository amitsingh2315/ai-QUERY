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
  done:    { border: '#10b981', bg: 'rgba(16,185,129,0.13)', label: '#34d399', sub: '#e2e8f0', glow: '0 0 20px rgba(16,185,129,0.30)', badge: '#10b981' },
  active:  { border: '#6366f1', bg: 'rgba(99,102,241,0.15)',  label: '#a5b4fc', sub: '#e2e8f0', glow: '0 0 20px rgba(99,102,241,0.35)', badge: '#6366f1' },
  pending: { border: '#334155', bg: 'rgba(15,23,42,0.70)',    label: '#475569', sub: '#334155', glow: 'none',                            badge: '#334155' },
  skipped: { border: '#1e293b', bg: 'rgba(10,14,25,0.80)',    label: '#1e293b', sub: '#1e293b', glow: 'none',                            badge: '#1e293b' },
};

/* ─── Step Card ─────────────────────────────────────────────────── */
function Card({ icon, title, sub, ts, status, stepNum }) {
  const t = TOKEN[status] || TOKEN.pending;
  const isDone   = status === 'done';
  const isActive = status === 'active';
  const isSkipped = status === 'skipped';

  return (
    <div style={{
      width: 158,
      minHeight: 118,
      flexShrink: 0,
      background: t.bg,
      border: `2px solid ${t.border}`,
      borderRadius: 14,
      padding: '12px 14px 10px',
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
        position: 'absolute', top: 8, right: 10,
        background: t.badge + '28',
        border: `1px solid ${t.badge}`,
        borderRadius: 99,
        width: 22, height: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color: t.label,
      }}>
        {isDone ? '✓' : isActive ? '●' : stepNum}
      </div>

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 26 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: t.label, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>
          {title}
        </span>
      </div>

      {/* Dynamic data */}
      {sub && (
        <div style={{ fontSize: 13, fontWeight: 700, color: isDone || isActive ? '#f1f5f9' : '#475569', lineHeight: 1.35, marginTop: 2 }}>
          {sub}
        </div>
      )}

      {/* Divider */}
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: t.border + '50', margin: '4px 0 6px' }} />

      {/* Timestamp / status label */}
      <div style={{ fontSize: 10.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
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
    <div style={{ position: 'relative', width: 120, height: 80, flexShrink: 0 }}>
      <svg width="120" height="80">
        <defs>
          <filter id="dg"><feGaussianBlur stdDeviation="4" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
        </defs>
        <polygon
          points="60,5 115,40 60,75 5,40"
          fill={t.bg}
          stroke={t.border}
          strokeWidth="2.5"
          style={{ filter: status !== 'pending' ? 'url(#dg)' : 'none', transition: 'all 0.35s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontSize: 9, fontWeight: 800, color: t.label, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
          Auto<br />Resolve?
        </span>
      </div>
    </div>
  );
}

/* ─── Arrow connector ───────────────────────────────────────────── */
function Arrow({ active, label, vertical = false }) {
  const color = active ? '#10b981' : '#334155';
  if (vertical) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 48, flexShrink: 0, justifyContent: 'center', gap: 2 }}>
        {label && <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#34d399' : '#475569', background: '#0d1424', padding: '1px 7px', borderRadius: 4, border: `1px solid ${color}` }}>{label}</span>}
        <svg width="14" height={label ? 24 : 38} style={{ display: 'block' }}>
          <line x1="7" y1="0" x2="7" y2={label ? 18 : 30} stroke={color} strokeWidth="2.5" />
          <polygon points="7,36 3,24 11,24" fill={color} transform={label ? 'translate(0,-12)' : ''} />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center', flexShrink: 0, width: 44, gap: 3 }}>
      {label && (
        <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#34d399' : '#475569', background: '#0d1424', padding: '1px 7px', borderRadius: 4, border: `1px solid ${color}`, whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <svg width="44" height="14">
        <line x1="0" y1="7" x2="34" y2="7" stroke={color} strokeWidth={active ? 3 : 2} strokeDasharray={active ? 'none' : '5 3'} />
        <polygon points="44,7 32,3 32,11" fill={color} />
      </svg>
    </div>
  );
}

/* ─── Availability Card ─────────────────────────────────────────── */
function AvailCard({ availability, ts }) {
  const avMap = {
    Available: { color: '#10b981', icon: '🟢', bg: 'rgba(16,185,129,0.13)', border: '#10b981', glow: '0 0 20px rgba(16,185,129,0.30)' },
    Busy:      { color: '#f59e0b', icon: '🟠', bg: 'rgba(245,158,11,0.13)',  border: '#f59e0b', glow: '0 0 20px rgba(245,158,11,0.28)' },
    'On Leave':{ color: '#64748b', icon: '⚫', bg: 'rgba(100,116,139,0.13)', border: '#64748b', glow: 'none' },
  };
  const c = avMap[availability] || { color: '#334155', icon: '⚪', bg: 'rgba(15,23,42,0.7)', border: '#334155', glow: 'none' };

  return (
    <div style={{
      width: 158, minHeight: 118, flexShrink: 0,
      background: c.bg, border: `2px solid ${c.border}`,
      borderRadius: 14, padding: '12px 14px 10px',
      boxShadow: c.glow, display: 'flex', flexDirection: 'column', gap: 4,
      transition: 'all 0.35s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>👤</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Availability
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: c.color, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span>{c.icon}</span>
        <span>{availability || 'Unknown'}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: c.border + '50', margin: '4px 0 6px' }} />
      <div style={{ fontSize: 10.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
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
      background: 'radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.07) 0%, rgba(8,12,24,0.97) 65%)',
      borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.07)',
      padding: '20px 24px 24px',
      overflowX: 'auto',
      overflowY: 'visible',
    }}>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 22, justifyContent: 'flex-end' }}>
        {[['#10b981','Completed'], ['#6366f1','In Progress'], ['#334155','Pending']].map(([color, lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{lbl}</span>
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
          sub={ticket.assignee_name || (hasAssignee ? `Agent #${ticket.assignee_id}` : wentHuman ? 'Routing…' : 'N/A')}
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
      <div style={{ height: 200 }} />

      {/* ── Scroll hint ── */}
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10.5, color: '#334155' }}>← scroll to see all steps →</span>
      </div>
    </div>
  );
}
