/**
 * TicketDetail Page — Module 5: Ticket lifecycle management
 * Shows AI analysis, timeline, flow diagram, and structured conversation.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Clock, User, MessageSquare, Send,
  AlertTriangle, CheckCircle2, Loader2, ArrowUpCircle, RefreshCw
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
  const [activeTab, setActiveTab] = useState('timeline');

  const fetchData = async () => {
    try {
      const [t, tl, n] = await Promise.all([
        ticketApi.get(id), ticketApi.getTimeline(id), ticketApi.getNotes(id)
      ]);
      setTicket(t);
      setTimeline(tl);
      setNotes(n);
      setStatusUpdate(t.status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

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
        author_name: 'Support Agent', // Or current logged in admin
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
    const m = { 'New': 'badge-new', 'Assigned': 'badge-assigned', 'In Progress': 'badge-in-progress',
      'Pending Info': 'badge-pending', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed' };
    return `badge ${m[s] || 'badge-new'}`;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/tickets')} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm text-gray-500 font-mono">#{ticket.id}</span>
            <span className={getSeverityClass(ticket.severity)}>{ticket.severity}</span>
            <span className={getStatusClass(ticket.status)}>{ticket.status}</span>
            {ticket.auto_resolved && <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">AI Resolved</span>}
            {ticket.escalated && <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">Escalated</span>}
          </div>
          <h1 className="text-2xl font-bold text-white">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content — Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Interactive Flow Diagram */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔀</span> Live Ticket Workflow
              <span className="ml-auto text-xs text-gray-600 font-normal">Pan · Zoom · Live Updates</span>
            </h3>
            <TicketFlowGraph ticket={ticket} />
          </div>

          {/* Reply Section (Large form + Conversation) */}
          <div className="glass-card overflow-hidden border-primary-500/20 shadow-lg shadow-primary-500/5">
            <div className="bg-surface-900/40 p-6 border-b border-white/5">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Agent Response
              </h3>
              
              {/* Agent Reply Input */}
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
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Conversation History</h4>
                  
                  {ticket.replies.map((reply) => (
                    <div key={reply.id} className={`flex gap-3 ${!reply.is_employee_reply ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center ${reply.is_employee_reply ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-surface-700 text-gray-300 border border-white/10'}`}>
                        {reply.is_employee_reply ? <User className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className={`flex-1 ${!reply.is_employee_reply ? 'text-right' : ''}`}>
                        <div className="bg-surface-800 p-4 rounded-xl border border-white/5 inline-block text-left relative min-w-[200px] max-w-[85%]">
                          <div className="flex items-center justify-between gap-4 mb-2 border-b border-white/5 pb-2">
                            <span className="text-sm font-semibold text-gray-300">{reply.author_name}</span>
                            <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{reply.content}</p>
                          
                          {/* User Feedback Status on Agent Replies */}
                          {reply.is_employee_reply && reply.feedback_helpful !== null && (
                            <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1.5 justify-end">
                              {reply.feedback_helpful 
                                ? <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">User Satisfied ✓</span>
                                : <span className="text-[10px] text-red-400 font-medium px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">User Not Satisfied ✗</span>
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description & AI Analysis */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Original Issue</h3>
            <p className="text-gray-300 whitespace-pre-wrap bg-surface-900/30 p-4 rounded-xl border border-white/5 font-mono text-sm">{ticket.description}</p>
            
            <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mt-6 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Analysis Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ['Category', ticket.category],
                ['Severity', ticket.severity],
                ['Sentiment', ticket.sentiment],
                ['Confidence', `${Math.round((ticket.confidence_score || 0) * 100)}%`],
                ['Resolution Path', ticket.recommended_resolution_path],
                ['Est. Time', ticket.estimated_resolution_time],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface-900/30 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase">{label}</p>
                  <p className="text-sm font-medium text-white">{value || '—'}</p>
                </div>
              ))}
            </div>
            {ticket.ai_summary && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-1">AI Summary</p>
                <p className="text-sm text-gray-300">{ticket.ai_summary}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Activity Timeline</h3>
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No timeline events</p>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className="flex gap-4 animate-slide-up relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-surface-800 border-2 border-primary-500 flex items-center justify-center text-xs flex-shrink-0">
                      {getTimelineIcon(event.event_type)}
                    </div>
                    <div className="flex-1 bg-surface-900/30 p-3 rounded-xl border border-white/5">
                      <p className="text-sm text-white">{event.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="font-semibold text-primary-400">{event.actor}</span>
                        <span>•</span>
                        <span>{formatDate(event.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — Right 1/3 */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-4">
              {[
                ['Reported by', ticket.user_email],
                ['Department', ticket.department],
                ['Assigned to', ticket.assignee_name],
                ['Category', ticket.category],
                ['Created', formatDate(ticket.created_at)],
                ['Assigned at', formatDate(ticket.assigned_at)],
                ['Resolved at', formatDate(ticket.resolved_at)],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <p className="text-[10px] text-gray-500 uppercase">{label}</p>
                  <p className="text-sm text-white font-medium">{value || '—'}</p>
                </div>
              ))}
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
