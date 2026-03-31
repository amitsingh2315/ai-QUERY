/**
 * TicketDetail Page — Module 5: Ticket lifecycle management
 * Shows AI analysis, timeline, flow diagram, and structured conversation.
 * Layout: Flow Graph → Original Issue → AI Summary → Agent Response (left column)
 *         Details + AI Analysis cards + Status + Actions (right sidebar)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Clock, User, MessageSquare, Send,
  AlertTriangle, CheckCircle2, Loader2, ArrowUpCircle, RefreshCw,
  FileText, Bot
} from 'lucide-react';
import { ticketApi } from '../api.js';
import TicketFlowGraph from '../components/TicketFlowGraph.jsx';

const STATUSES = ['New', 'Assigned', 'In Progress', 'Pending Info', 'Resolved', 'Closed'];

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyForm, setReplyForm] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');

  const pollRef = useRef(null);
  const CLOSED_STATUSES = ['Resolved', 'Closed'];

  const fetchData = useCallback(async (silent = false) => {
    try {
      const [t, tl, n] = await Promise.all([
        ticketApi.get(id), ticketApi.getTimeline(id), ticketApi.getNotes(id)
      ]);
      setTicket(t);
      setTimeline(tl);
      setNotes(n);
      // Only reset the status dropdown on the first/manual load
      if (!silent) setStatusUpdate(t.status);
      // Stop polling once ticket reaches a terminal state
      if (CLOSED_STATUSES.includes(t.status)) {
        clearInterval(pollRef.current);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  // Initial load + start 3-second live poll for new user messages
  useEffect(() => {
    fetchData(false); // first load shows spinner
    pollRef.current = setInterval(() => fetchData(true), 3000); // silent poll
    return () => clearInterval(pollRef.current); // cleanup on unmount/id change
  }, [fetchData]);

  // Auto-scroll to Agent Response section when ?scroll=agent-response
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (!loading && ticket && searchParams.get('scroll') === 'agent-response') {
      const el = document.getElementById('agent-response');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  }, [loading, ticket, searchParams]);

  const handleStatusUpdate = async () => {
    if (statusUpdate === ticket.status) return;
    try {
      await ticketApi.updateStatus(id, { status: statusUpdate, actor: 'Admin' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleEscalate = async () => {
    if (!confirm('Escalate this ticket to another agent?')) return;
    try {
      const res = await ticketApi.escalate(id);
      alert(`Escalated to ${res.new_assignee}`);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyForm.trim()) return;
    try {
      await ticketApi.addReply(id, {
        author_email: 'admin@company.com',
        author_name: 'Support Agent',
        content: replyForm,
        is_employee_reply: true,
      });
      setReplyForm('');
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const getSeverityClass = (s) => {
    const m = { 'Critical': 'badge-critical', 'High': 'badge-high', 'Medium': 'badge-medium', 'Low': 'badge-low' };
    return `badge ${m[s] || 'badge-medium'}`;
  };

  const getStatusClass = (s) => {
    const m = { 'New': 'badge-status-open', 'Assigned': 'badge-status-progress', 'In Progress': 'badge-status-progress',
      'Pending Info': 'badge-status-progress', 'Resolved': 'badge-status-resolved', 'Closed': 'badge-status-closed' };
    return `badge ${m[s] || 'badge-status-open'}`;
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const getTimelineIcon = (type) => {
    const icons = {
      'created': '🆕', 'ai_analysis': '🤖', 'auto_resolved': '✅', 'routed': '🔀',
      'assigned': '👤', 'status_change': '🔄', 'note': '📝', 'reply': '💬', 'reply_feedback': '👍',
      'escalation': '🚨', 'reopened': '🔓', 'resolved': '✅', 'reassigned': '🔀'
    };
    return icons[type] || '📋';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-400 text-lg">Ticket not found</p>
        <button onClick={() => navigate('/tickets')} className="btn-primary mt-4">Go Back</button>
      </div>
    );
  }

  // ─── Severity color for sidebar pill ─────────────────────
  const severityColor = {
    Critical: 'text-red-400 bg-red-400/10 border-red-400/20',
    High:     'text-orange-400 bg-orange-400/10 border-orange-400/20',
    Medium:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
    Low:      'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  }[ticket.severity] || 'text-gray-400 bg-white/5 border-white/10';

  return (
    <div className="animate-fade-in">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/tickets')} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-sm text-gray-500 font-mono">#{ticket.id}</span>
            <span className={getSeverityClass(ticket.severity)}>{ticket.severity}</span>
            <span className={getStatusClass(ticket.status)}>{ticket.status}</span>
            {ticket.auto_resolved && (
              <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">AI Resolved</span>
            )}
            {ticket.escalated && (
              <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">Escalated</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════════════════════════════════════════════
            LEFT COLUMN  (2/3)
            Order: Flow Graph → Original Issue → AI Summary → Agent Response → Timeline
        ════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1️⃣  Live Ticket Workflow */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>🔀</span> Live Ticket Workflow
              <span className="ml-auto text-xs text-gray-600 font-normal">Pan · Zoom · Live Updates</span>
            </h3>
            <TicketFlowGraph ticket={ticket} />
          </div>

          {/* 2️⃣  Original Issue + AI Summary — same card */}
          <div className="glass-card p-6">
            {/* Original Issue */}
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Original Issue
            </h3>
            <p className="text-gray-300 whitespace-pre-wrap bg-surface-900/30 p-4 rounded-xl border border-white/5 font-mono text-sm leading-relaxed">
              {ticket.description}
            </p>

            {/* AI Summary — only if present */}
            {ticket.ai_summary && (
              <>
                <div className="border-t border-white/5 mt-5 pt-5" />
                <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> AI Summary
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">{ticket.ai_summary}</p>

                {/* Auto-response if AI resolved */}
                {ticket.auto_resolved && ticket.auto_response && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Auto-Response Sent to User
                    </p>
                    <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                      {ticket.auto_response}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4️⃣  Agent Response */}
          <div id="agent-response" className="glass-card overflow-hidden border-primary-500/20 shadow-lg shadow-primary-500/5">
            <div className="bg-surface-900/40 p-6 border-b border-white/5">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Agent Response
              </h3>

              {/* Reply Input */}
              {['Resolved', 'Closed'].indexOf(ticket.status) === -1 && (
                <form onSubmit={handleReplySubmit} className="mb-6">
                  <textarea
                    rows={4}
                    required
                    placeholder={`Write a reply to ${ticket.user_email}...`}
                    value={replyForm}
                    onChange={(e) => setReplyForm(e.target.value)}
                    className="input-field mb-3 resize-none bg-surface-800/80 focus:border-primary-500"
                  />
                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary text-sm py-2 px-6 flex items-center gap-2 shadow-lg shadow-primary-500/20">
                      <Send className="w-4 h-4" /> Send Reply to User
                    </button>
                  </div>
                </form>
              )}

              {/* Conversation History */}
              {ticket.replies && ticket.replies.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#2a2a2a] chat-scroll">
                  <h4 className="text-xs font-semibold text-[#A1A1A1] uppercase tracking-wider mb-4">
                    Conversation History
                  </h4>
                  {ticket.replies.map((reply) => (
                    <div key={reply.id} className={`flex gap-2.5 ${!reply.is_employee_reply ? 'justify-end' : 'justify-start'}`}>
                      {reply.is_employee_reply && (
                        <div className="chat-avatar chat-avatar-agent">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className={reply.is_employee_reply ? 'chat-bubble-agent' : 'chat-bubble-user'}>
                        <div className="flex items-center justify-between gap-4 mb-2 border-b border-[#2a2a2a] pb-2">
                          <span className={`text-sm font-semibold ${reply.is_employee_reply ? 'text-purple-400' : 'text-neutral-300'}`}>{reply.author_name}</span>
                          <span className="text-xs text-neutral-500">{formatDate(reply.created_at)}</span>
                        </div>
                        <p className="text-sm text-neutral-200 whitespace-pre-wrap">{reply.content}</p>
                        
                        {reply.is_employee_reply && reply.feedback_helpful !== null && (
                          <div className="mt-3 pt-2 text-[10px] flex items-center justify-end">
                            {reply.feedback_helpful
                              ? <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> User Satisfied</span>
                              : <span className="text-red-400 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> User Escalated</span>
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5️⃣  Activity Timeline */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5 border-b border-white/5 pb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Activity Timeline
            </h3>

            {timeline.length === 0 ? (
              <p className="text-[#A1A1A1] text-sm text-center py-6">No timeline events</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((event, idx) => {
                  const type = event.event_type || '';

                  // ── Simplified title ──────────────────────────
                  const simplify = (desc = '') => {
                    if (!desc) return desc;
                    if (desc.toLowerCase().includes('created')) return 'Ticket Created';
                    if (desc.toLowerCase().includes('ai analysis') || desc.toLowerCase().includes('analyzed')) return 'AI Analysis Completed';
                    if (desc.toLowerCase().includes('auto-resolved') || desc.toLowerCase().includes('auto resolved')) return 'AI Auto Resolved';
                    if (desc.toLowerCase().includes('routed') || desc.toLowerCase().includes('routing')) return 'Ticket Routed';
                    if (desc.toLowerCase().includes('employee reply') || desc.toLowerCase().includes('agent replied') || (type === 'reply' && event.actor !== ticket.user_email)) return 'Agent Replied';
                    if (desc.toLowerCase().includes('user reply') || (type === 'reply' && event.actor === ticket.user_email)) return 'User Replied';
                    if (desc.toLowerCase().includes('assigned')) return 'Ticket Assigned';
                    if (desc.toLowerCase().includes('escalat')) return 'Ticket Escalated';
                    if (desc.toLowerCase().includes('resolved')) return 'Ticket Resolved';
                    if (desc.toLowerCase().includes('closed')) return 'Ticket Closed';
                    if (desc.toLowerCase().includes('feedback') || desc.toLowerCase().includes('helpful')) return 'Feedback Submitted';
                    if (desc.toLowerCase().includes('status')) return 'Status Updated';
                    if (desc.toLowerCase().includes('reopened')) return 'Ticket Reopened';
                    return desc.length > 48 ? desc.slice(0, 48) + '…' : desc;
                  };

                  const timeOnly = (d) => d
                    ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '—';

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-4"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      {/* Left: time */}
                      <div className="w-16 flex-shrink-0 pt-0.5">
                        <span className="text-xs font-mono text-[#A1A1A1]">
                          {timeOnly(event.created_at)}
                        </span>
                      </div>

                      {/* Right: event info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white mb-0.5">
                          {simplify(event.description)}
                        </p>
                        {event.actor && (
                          <p className="text-[11px] text-[#A1A1A1] truncate">{event.actor}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ════════════════════════════════════════════════════
            RIGHT SIDEBAR  (1/3)
            Details · AI Analysis Cards · Status Update · Actions
        ════════════════════════════════════════════════════ */}
        <div className="space-y-6">

          {/* Details Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3">
              {[
                ['Reported by', ticket.user_email],
                ['Department',  ticket.department],
                ['Assigned to', ticket.assignee_name],
                ['Created',     formatDate(ticket.created_at)],
                ['Assigned at', formatDate(ticket.assigned_at)],
                ['Resolved at', formatDate(ticket.resolved_at)],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-white font-medium">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Cards — moved to right sidebar */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Analysis
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Category',        value: ticket.category },
                { label: 'Severity',        value: ticket.severity },
                { label: 'Sentiment',       value: ticket.sentiment },
                { label: 'Confidence',      value: `${Math.round((ticket.confidence_score || 0) * 100)}%` },
                { label: 'Resolution Path', value: ticket.recommended_resolution_path },
                { label: 'Est. Time',       value: ticket.estimated_resolution_time },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-900/40 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-xs font-semibold text-white truncate">{value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Severity visual indicator */}
            <div className={`mt-3 px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 ${severityColor}`}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {ticket.severity} Priority
            </div>
          </div>

          {/* Status Update */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Update Status</h3>
            <select
              value={statusUpdate}
              onChange={(e) => setStatusUpdate(e.target.value)}
              className="input-field text-sm py-2.5 mb-3"
              id="status-update-select"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleStatusUpdate} className="btn-primary w-full text-sm py-2">
              Update Status
            </button>
          </div>

          {/* Actions */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-3">
              <button onClick={handleEscalate} className="btn-danger w-full text-sm py-2 flex items-center justify-center gap-2">
                <ArrowUpCircle className="w-4 h-4" /> Escalate Ticket
              </button>
              <button onClick={fetchData} className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh Data
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
