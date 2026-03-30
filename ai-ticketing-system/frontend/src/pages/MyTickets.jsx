/**
 * MyTickets Page — User's personal ticket dashboard
 * Shows all tickets submitted by the user with AI analysis results,
 * status tracking, auto-resolution responses, and employee replies.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Sparkles, Clock, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, Inbox, Mail, AlertTriangle,
  MessageSquare, Send, Check, Users
} from 'lucide-react';
import { ticketApi } from '../api.js';

export default function MyTickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || localStorage.getItem('userEmail') || '');
  const [submittedEmail, setSubmittedEmail] = useState(searchParams.get('email') || localStorage.getItem('userEmail') || '');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searched, setSearched] = useState(false);
  const [replyText, setReplyText] = useState({}); // { ticketId: 'text' }

  const fetchMyTickets = async (emailToFetch) => {
    if (!emailToFetch) return;
    setLoading(true);
    try {
      const data = await ticketApi.listByEmail(emailToFetch);
      setTickets(data);
      setSearched(true);
      localStorage.setItem('userEmail', emailToFetch);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialEmail = searchParams.get('email') || localStorage.getItem('userEmail');
    if (initialEmail) {
      setEmail(initialEmail);
      setSubmittedEmail(initialEmail);
      fetchMyTickets(initialEmail);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSubmittedEmail(email);
    setSearchParams({ email });
    fetchMyTickets(email);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleUserReply = async (ticketId) => {
    const text = replyText[ticketId];
    if (!text || !text.trim()) return;

    try {
      await ticketApi.addReply(ticketId, {
        author_email: email,
        author_name: 'You (User)',
        content: text,
        is_employee_reply: false,
      });
      setReplyText({ ...replyText, [ticketId]: '' });
      fetchMyTickets(email);
    } catch (err) { alert(err.message); }
  };

  const handleFeedback = async (ticketId, replyId, isHelpful) => {
    try {
      await ticketApi.giveReplyFeedback(ticketId, replyId, { is_helpful: isHelpful });
      alert(isHelpful ? "Thanks! Your ticket is now marked resolved." : "Thanks! We are assigning a new agent to assist you.");
      fetchMyTickets(email);
    } catch (err) { alert(err.message); }
  };

  const handleAutoResponseFeedback = async (ticketId, isHelpful) => {
    try {
      await ticketApi.submitFeedback(ticketId, { ticket_id: ticketId, is_helpful: isHelpful });
      alert(isHelpful ? 'Thank you for your feedback!' : 'Your ticket has been routed to a human agent.');
      fetchMyTickets(email);
    } catch (err) { alert(err.message); }
  };

  const getSeverityClass = (severity) => {
    const map = { 'Critical': 'badge-critical', 'High': 'badge-high', 'Medium': 'badge-medium', 'Low': 'badge-low' };
    return `badge ${map[severity] || 'badge-medium'}`;
  };

  const getStatusClass = (status) => {
    const map = {
      'New': 'badge-new', 'Assigned': 'badge-assigned', 'In Progress': 'badge-in-progress',
      'Pending Info': 'badge-pending', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed',
    };
    return `badge ${map[status] || 'badge-new'}`;
  };

  const formatDateExact = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const stats = {
    total: tickets.length,
    resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
    inProgress: tickets.filter(t => ['Assigned', 'In Progress'].includes(t.status)).length,
    pending: tickets.filter(t => ['New', 'Pending Info'].includes(t.status)).length,
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 p-6 glass-card border-primary-500/20 shadow-lg shadow-primary-500/10">
        <h1 className="text-3xl font-bold gradient-text mb-2 text-center md:text-left">User Portal</h1>
        <p className="text-gray-400 text-center md:text-left flex items-center justify-center md:justify-start gap-2">
          <Mail className="w-4 h-4" /> Logged in as: <span className="text-white font-medium">{submittedEmail || 'Not logged in'}</span>
        </p>
      </div>

      {/* Email Search / Login */}
      <form onSubmit={handleSearch} className="glass-card p-6 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Change User Email
          </label>
          <input
            type="email" required placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <button type="submit" className="btn-primary w-full md:w-auto flex items-center justify-center gap-2 px-8 h-[46px]">
          <Search className="w-4 h-4" /> Load Tickets
        </button>
      </form>

      {searched && tickets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className={`glass-card p-5 bg-gradient-to-br from-primary-600/10 to-transparent border-primary-500/20`}>
              <p className="text-xs text-gray-400 mb-1">Total Active</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className={`glass-card p-5 bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/20`}>
              <p className="text-xs text-gray-400 mb-1">Resolved</p>
              <p className="text-3xl font-bold text-emerald-400">{stats.resolved}</p>
            </div>
            <div className={`glass-card p-5 bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20`}>
              <p className="text-xs text-gray-400 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
            </div>
            <div className={`glass-card p-5 bg-gradient-to-br from-amber-600/10 to-transparent border-amber-500/20`}>
              <p className="text-xs text-gray-400 mb-1">Pending action</p>
              <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
            </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>
      )}

      {searched && !loading && tickets.length === 0 && (
        <div className="glass-card p-16 text-center">
          <Inbox className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">No tickets found</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-6">Create New Ticket</button>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="space-y-6">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="glass-card overflow-hidden">
              {/* Header */}
              <div
                className="p-6 cursor-pointer hover:bg-white/[.02] transition-colors flex items-start justify-between gap-4"
                onClick={() => toggleExpand(ticket.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-sm font-mono text-primary-400">#{ticket.id}</span>
                    <span className={getStatusClass(ticket.status)}>{ticket.status}</span>
                    <span className={getSeverityClass(ticket.severity)}>{ticket.severity}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{ticket.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {formatDateExact(ticket.created_at)}</span>
                    <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary-400" /> Est. {ticket.estimated_resolution_time || 'N/A'}</span>
                  </div>
                </div>
                {expandedId === ticket.id ? <ChevronUp className="w-6 h-6 text-gray-500" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
              </div>

              {/* Expanded Body */}
              {expandedId === ticket.id && (
                <div className="border-t border-white/5 bg-surface-900/40 p-6 space-y-8 animate-slide-up">
                  
                  {/* Original Description */}
                  <div className="glass-card p-5 bg-surface-800/50">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">Your query</h4>
                    <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
                  </div>

                  {/* Auto-Resolution Thread */}
                  {ticket.auto_resolved && ticket.auto_response && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="glass-card p-5 border-emerald-500/20 bg-emerald-500/5 flex-1 relative group">
                        <h4 className="text-sm font-semibold text-emerald-400 mb-1">AI Assistant Response</h4>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap mb-4">{ticket.auto_response}</p>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">Did this resolve your issue?</span>
                          <button onClick={() => handleAutoResponseFeedback(ticket.id, true)} className="btn-success text-xs py-1.5 px-3">
                            <Check className="w-3 h-3 inline mr-1" /> Yes
                          </button>
                          <button onClick={() => handleAutoResponseFeedback(ticket.id, false)} className="btn-danger text-xs py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                            No, I need human help
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employee Replies Conversation */}
                  {ticket.replies && ticket.replies.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 border-b border-white/5 pb-2">Conversation History</h4>
                      {ticket.replies.map(r => (
                        <div key={r.id} className={`flex gap-4 ${!r.is_employee_reply ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${r.is_employee_reply ? 'bg-primary-500/20 border-primary-500/30' : 'bg-surface-600 border-surface-500'}`}>
                            {r.is_employee_reply ? <Users className="w-4 h-4 text-primary-400" /> : <Mail className="w-4 h-4 text-gray-300" />}
                          </div>
                          
                          <div className={`glass-card p-4 max-w-[85%] ${!r.is_employee_reply ? 'bg-surface-700/50' : 'border-primary-500/10 bg-primary-900/10'}`}>
                            <div className="flex items-center justify-between mb-2 gap-4">
                              <span className={`text-sm font-semibold ${r.is_employee_reply ? 'text-primary-400' : 'text-gray-300'}`}>{r.author_name}</span>
                              <span className="text-[10px] text-gray-500">{formatDateExact(r.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                            
                            {/* Feedback mechanism for Employee responses */}
                            {r.is_employee_reply && r.feedback_helpful === null && ['Resolved', 'Closed'].indexOf(ticket.status) === -1 && (
                              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                                <span className="text-xs text-gray-400">Are you satisfied with this answer?</span>
                                <button onClick={() => handleFeedback(ticket.id, r.id, true)} className="text-xs py-1 px-3 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors">Yes, close ticket</button>
                                <button onClick={() => handleFeedback(ticket.id, r.id, false)} className="text-xs py-1 px-3 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">No, I need more help</button>
                              </div>
                            )}
                            {r.is_employee_reply && r.feedback_helpful !== null && (
                              <div className="mt-3 text-xs flex items-center gap-1.5">
                                {r.feedback_helpful 
                                  ? <span className="text-emerald-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> User marked as helpful</span> 
                                  : <span className="text-red-400 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> User marked as not helpful (escalated)</span>
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input Box */}
                  {['Resolved', 'Closed'].indexOf(ticket.status) === -1 && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <div className="flex gap-3 relative">
                        <textarea
                          rows={2}
                          className="input-field flex-1 resize-none py-3 pr-16"
                          placeholder="Type your reply to the agent here..."
                          value={replyText[ticket.id] || ''}
                          onChange={e => setReplyText({...replyText, [ticket.id]: e.target.value})}
                        />
                        <button 
                          onClick={() => handleUserReply(ticket.id)}
                          disabled={!replyText[ticket.id]}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white p-2 rounded-xl transition-colors shadow-lg shadow-primary-500/20"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
