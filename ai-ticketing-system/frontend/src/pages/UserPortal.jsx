/**
 * UserPortal.jsx — Unified Support Dashboard
 * Merges Submit Ticket + My Tickets into a single intelligent portal.
 *
 * Views:
 *   1. Email Login
 *   2. New Issue Form  (when no active ticket)
 *   3. AI Suggestion   (after auto-resolve)
 *   4. Active Chat     (when ticket is open / assigned)
 *
 * Previous-ticket history is always accessible at the bottom.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Sparkles, Loader2, CheckCircle2, AlertTriangle,
  ImageIcon, X, UploadCloud, ChevronDown, ChevronUp,
  HelpCircle, Mail, Clock, Users, MessageSquare,
  XCircle, ThumbsUp, ThumbsDown, Inbox, Search, Check,
  LogOut, ArrowRight, Bot, User, Hash, FileText
} from 'lucide-react';
import { ticketApi } from '../api.js';

// ────────────────────────────────────────────────────────────
//  FAQ Data (shared)
// ────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'How do I reset my account password?',
    a: 'Go to the login page and click "Forgot Password". Enter your registered email address and follow the reset link sent to your inbox. If you don\'t see it, check your spam folder.',
  },
  {
    q: 'My payment failed but money was deducted. What should I do?',
    a: 'Sometimes banks take a few minutes to confirm transactions. Please wait 10–15 minutes. If the order is still not created, the deducted amount will be automatically refunded within 3–5 business days.',
  },
  {
    q: 'The website is not loading properly. How can I fix it?',
    a: 'Try refreshing the page (Ctrl + F5), clearing your browser cache and cookies, or opening the website in a different browser or device. If the issue persists, please submit a ticket with a screenshot.',
  },
  {
    q: 'How can I update my email or profile information?',
    a: 'Go to your account settings page and select "Edit Profile". Update your information and click Save. Changes take effect immediately.',
  },
  {
    q: "I submitted a ticket but haven't received a response. What should I do?",
    a: 'Support teams usually respond within the estimated resolution time shown on your ticket. You can check the real-time status in your portal. If it\'s been longer than expected, you can reply directly.',
  },
  {
    q: 'Can I attach a screenshot or document to my ticket?',
    a: 'Yes! Use the upload field on the ticket form to attach an image (PNG, JPG, GIF, WebP) or PDF up to 5MB.',
  },
  {
    q: 'How does the AI automatically analyze my ticket?',
    a: 'When you submit a ticket, our AI instantly reads your description and automatically detects the category, priority level, and estimated resolution time. It then routes your ticket to the right team or resolves it automatically if a known solution exists.',
  },
];

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['New', 'Assigned', 'In Progress', 'Pending Info'];

const getSeverityBadge = (s) => {
  const m = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
  return `badge ${m[s] || 'badge-medium'}`;
};

const getStatusBadge = (s) => {
  const m = {
    New: 'badge-status-open', Assigned: 'badge-status-progress', 'In Progress': 'badge-status-progress',
    'Pending Info': 'badge-status-progress', Resolved: 'badge-status-resolved', Closed: 'badge-status-closed',
  };
  return `badge ${m[s] || 'badge-status-open'}`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const fmtDateFull = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

// ────────────────────────────────────────────────────────────
//  Main Component
// ────────────────────────────────────────────────────────────

export default function UserPortal() {
  // Auth
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('userEmail'));

  // Tickets
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  // New-issue form
  const [description, setDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // AI suggestion
  const [aiSuggestionTicket, setAiSuggestionTicket] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Chat
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const chatEndRef = useRef(null);

  // FAQ
  const [openFaq, setOpenFaq] = useState(null);

  // Tab
  const [activeTab, setActiveTab] = useState('new-issue');

  // Previous tickets
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Polling
  const pollRef = useRef(null);

  // ──────────────────────────────────────────────────────────
  //  Data Fetching
  // ──────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async (em) => {
    if (!em) return;
    setLoading(true);
    try {
      const data = await ticketApi.listByEmail(em);
      setTickets(data);

      // Find active ticket
      const active = data.find(t => ACTIVE_STATUSES.includes(t.status));
      setActiveTicket(active || null);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshActiveTicket = useCallback(async () => {
    if (!activeTicket) return;
    try {
      const updated = await ticketApi.get(activeTicket.id);
      // Merge assignee info
      setActiveTicket(updated);

      // Also refresh full list
      const data = await ticketApi.listByEmail(email);
      setTickets(data);

      // If ticket was resolved/closed by agent, switch back
      if (!ACTIVE_STATUSES.includes(updated.status)) {
        setActiveTicket(null);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }, [activeTicket, email]);

  // Auto-login if email is stored
  useEffect(() => {
    if (loggedIn && email) {
      fetchTickets(email);
    }
  }, [loggedIn, email, fetchTickets]);

  // Poll active ticket every 8 seconds
  useEffect(() => {
    if (activeTicket) {
      pollRef.current = setInterval(refreshActiveTicket, 8000);
      return () => clearInterval(pollRef.current);
    }
    return () => {};
  }, [activeTicket, refreshActiveTicket]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.replies]);

  // ──────────────────────────────────────────────────────────
  //  Handlers
  // ──────────────────────────────────────────────────────────

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    localStorage.setItem('userEmail', email);
    setLoggedIn(true);
    fetchTickets(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    setEmail('');
    setLoggedIn(false);
    setTickets([]);
    setActiveTicket(null);
    setAiSuggestionTicket(null);
  };

  // File handling
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setFormError('Only images (PNG, JPG, GIF, WebP) and PDFs are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size must be under 5MB.');
      return;
    }
    setFormError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({ name: file.name, size: file.size, preview: file.type.startsWith('image/') ? e.target.result : null });
      setAttachmentUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setAttachmentUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit new issue
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setFormError('Please describe your issue in at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const ticket = await ticketApi.create({
        description,
        user_email: email,
        attachment_url: attachmentUrl || null,
      });

      if (ticket.auto_resolved) {
        // Show AI suggestion view
        setAiSuggestionTicket(ticket);
      } else {
        // Go directly to chat
        setActiveTicket(ticket);
        await fetchTickets(email);
      }

      // Reset form
      setDescription('');
      setUploadedFile(null);
      setAttachmentUrl('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // AI Suggestion feedback
  const handleAiFeedback = async (isHelpful) => {
    if (!aiSuggestionTicket) return;
    setFeedbackLoading(true);
    try {
      await ticketApi.submitFeedback(aiSuggestionTicket.id, {
        ticket_id: aiSuggestionTicket.id,
        is_helpful: isHelpful,
      });

      if (isHelpful) {
        // Ticket stays resolved — go back to form
        setAiSuggestionTicket(null);
        await fetchTickets(email);
      } else {
        // Ticket reopened & assigned — open chat
        const updated = await ticketApi.get(aiSuggestionTicket.id);
        setAiSuggestionTicket(null);
        setActiveTicket(updated);
        await fetchTickets(email);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Send chat reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setSendingReply(true);
    try {
      await ticketApi.addReply(activeTicket.id, {
        author_email: email,
        author_name: 'You',
        content: replyText,
        is_employee_reply: false,
      });
      setReplyText('');
      await refreshActiveTicket();
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Reply satisfaction check
  const handleReplySatisfaction = async (replyId, isHelpful) => {
    if (!activeTicket) return;
    try {
      await ticketApi.giveReplyFeedback(activeTicket.id, replyId, { is_helpful: isHelpful });
      if (isHelpful) {
        // Ticket resolved
        setActiveTicket(null);
        await fetchTickets(email);
      } else {
        await refreshActiveTicket();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Auto-response feedback
  const handleAutoResponseFeedback = async (ticketId, isHelpful) => {
    try {
      await ticketApi.submitFeedback(ticketId, { ticket_id: ticketId, is_helpful: isHelpful });
      if (isHelpful) {
        setActiveTicket(null);
        await fetchTickets(email);
      } else {
        const updated = await ticketApi.get(ticketId);
        setActiveTicket(updated);
        await fetchTickets(email);
      }
    } catch (err) { alert(err.message); }
  };

  // Close ticket
  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      await ticketApi.updateStatus(activeTicket.id, { status: 'Closed', actor: email });
      setActiveTicket(null);
      await fetchTickets(email);
    } catch (err) {
      alert(err.message);
    }
  };

  // ──────────────────────────────────────────────────────────
  //  Derived data
  // ──────────────────────────────────────────────────────────

  const previousTickets = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status));
  const isTicketReadOnly = activeTicket && ['Resolved', 'Closed'].includes(activeTicket.status);

  // ──────────────────────────────────────────────────────────
  //  VIEW 1 — Email Login
  // ──────────────────────────────────────────────────────────

  if (!loggedIn) {
    return (
      <div className="animate-fade-in flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-[#22c55e]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">User Portal</h1>
            <p className="text-neutral-400 text-sm">AI-powered support at your fingertips</p>
          </div>

          <form onSubmit={handleLogin} className="glass-card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Your Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  id="portal-email"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3" id="portal-login-btn">
              <ArrowRight className="w-4 h-4" />
              Enter Support Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  //  VIEW 3 — AI Suggestion
  // ──────────────────────────────────────────────────────────

  if (aiSuggestionTicket) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        {/* Header */}
        <PortalHeader email={email} onLogout={handleLogout} />

        <div className="glass-card p-8 mt-6">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-[#22c55e]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Suggested Solution</h2>
              <p className="text-sm text-neutral-400">Our AI found a possible solution for you</p>
            </div>
          </div>

          {/* AI Analysis summary */}
          <div className="bg-[#0f0f0f] rounded-xl p-5 mb-5 border border-[#2a2a2a]">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Category</p>
                <p className="text-sm font-medium text-white">{aiSuggestionTicket.category}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Severity</p>
                <span className={getSeverityBadge(aiSuggestionTicket.severity)}>{aiSuggestionTicket.severity}</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Confidence</p>
                <p className="text-sm font-medium text-white">{Math.round((aiSuggestionTicket.confidence_score || 0) * 100)}%</p>
              </div>
            </div>
            {aiSuggestionTicket.ai_summary && (
              <div className="pt-3 border-t border-[#2a2a2a]">
                <p className="text-xs text-neutral-500 mb-1">AI Summary</p>
                <p className="text-sm text-neutral-300">{aiSuggestionTicket.ai_summary}</p>
              </div>
            )}
          </div>

          {/* Suggested solution */}
          <div className="bg-[#22c55e]/5 rounded-xl p-6 border border-[#22c55e]/20 mb-6">
            <h3 className="text-sm font-semibold text-[#22c55e] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Suggested Solution
            </h3>
            <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">{aiSuggestionTicket.auto_response}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleAiFeedback(true)}
              disabled={feedbackLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] font-semibold text-sm hover:bg-[#22c55e]/20 transition-all active:scale-[0.98] disabled:opacity-50"
              id="ai-accept-btn"
            >
              <ThumbsUp className="w-4 h-4" />
              This solved my issue 👍
            </button>
            <button
              onClick={() => handleAiFeedback(false)}
              disabled={feedbackLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              id="ai-reject-btn"
            >
              <ThumbsDown className="w-4 h-4" />
              Still need help 👎
            </button>
          </div>

          {feedbackLoading && (
            <div className="flex items-center justify-center gap-2 mt-4 text-neutral-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          )}
        </div>

        {/* Previous tickets at bottom */}
        <PreviousTickets
          tickets={previousTickets}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          expandedHistoryId={expandedHistoryId}
          setExpandedHistoryId={setExpandedHistoryId}
          handleAutoResponseFeedback={handleAutoResponseFeedback}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  //  VIEW 4 — Active Chat
  // ──────────────────────────────────────────────────────────

  if (activeTicket) {
    const replies = activeTicket.replies || [];
    const isClosed = ['Resolved', 'Closed'].includes(activeTicket.status);

    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        {/* Header */}
        <PortalHeader email={email} onLogout={handleLogout} />

        {/* Chat Card */}
        <div className="glass-card mt-6 flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>

          {/* Chat header */}
          <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">Ticket #{activeTicket.id}</span>
                  <span className={getStatusBadge(activeTicket.status)}>{activeTicket.status}</span>
                  {activeTicket.severity && <span className={getSeverityBadge(activeTicket.severity)}>{activeTicket.severity}</span>}
                </div>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {activeTicket.assignee_name ? `Assigned to ${activeTicket.assignee_name}` : 'Awaiting assignment'}
                  {activeTicket.category && ` · ${activeTicket.category}`}
                </p>
              </div>
            </div>
            {!isClosed && (
              <button
                onClick={handleCloseTicket}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all flex-shrink-0"
                id="close-ticket-btn"
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Ticket
              </button>
            )}
            {isClosed && (
              <button
                onClick={() => { setActiveTicket(null); fetchTickets(email); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-[#2a2a2a] text-neutral-300 text-xs font-semibold hover:bg-white/10 transition-all flex-shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                New Issue
              </button>
            )}
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">

            {/* Original issue (user message) */}
            <div className="flex justify-end">
              <div className="chat-bubble-user">
                <p className="text-sm whitespace-pre-wrap">{activeTicket.description}</p>
                <p className="text-[10px] text-neutral-400 mt-2 text-right">{fmtDate(activeTicket.created_at)}</p>
              </div>
            </div>

            {/* AI Summary — system message */}
            {activeTicket.ai_summary && (
              <div className="flex justify-center">
                <div className="chat-bubble-system">
                  <Sparkles className="w-3 h-3 text-[#22c55e] inline mr-1.5" />
                  <span className="text-xs text-neutral-400">AI: {activeTicket.ai_summary}</span>
                </div>
              </div>
            )}

            {/* Auto-response (if exists and wasn't accepted) */}
            {activeTicket.auto_response && (
              <div className="flex justify-start gap-2.5">
                <div className="chat-avatar chat-avatar-ai">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="chat-bubble-ai">
                  <p className="text-xs font-semibold text-[#22c55e] mb-1.5">AI Assistant</p>
                  <p className="text-sm whitespace-pre-wrap text-neutral-200">{activeTicket.auto_response}</p>
                  <p className="text-[10px] text-neutral-500 mt-2">{fmtDate(activeTicket.created_at)}</p>
                </div>
              </div>
            )}

            {/* Conversation replies */}
            {replies.map((r) => (
              <React.Fragment key={r.id}>
                {r.is_employee_reply ? (
                  /* Agent message — left */
                  <div className="flex justify-start gap-2.5">
                    <div className="chat-avatar chat-avatar-agent">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="chat-bubble-agent">
                      <p className="text-xs font-semibold text-purple-400 mb-1.5">{r.author_name}</p>
                      <p className="text-sm whitespace-pre-wrap text-neutral-200">{r.content}</p>
                      <p className="text-[10px] text-neutral-500 mt-2">{fmtDate(r.created_at)}</p>

                      {/* Satisfaction check */}
                      {r.feedback_helpful === null && !isClosed && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-xs text-neutral-400 mb-2">Are you satisfied with this response?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReplySatisfaction(r.id, true)}
                              className="satisfaction-btn satisfaction-btn-yes"
                            >
                              <Check className="w-3 h-3" /> Yes, close ticket
                            </button>
                            <button
                              onClick={() => handleReplySatisfaction(r.id, false)}
                              className="satisfaction-btn satisfaction-btn-no"
                            >
                              <X className="w-3 h-3" /> No, need more help
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Feedback already given */}
                      {r.feedback_helpful !== null && (
                        <div className="mt-2 text-[10px]">
                          {r.feedback_helpful
                            ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Marked as helpful</span>
                            : <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Escalated</span>
                          }
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* User message — right */
                  <div className="flex justify-end">
                    <div className="chat-bubble-user">
                      <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                      <p className="text-[10px] text-neutral-400 mt-2 text-right">{fmtDate(r.created_at)}</p>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="p-4 border-t border-[#2a2a2a] flex-shrink-0">
            {isClosed ? (
              <div className="text-center py-2">
                <p className="text-sm text-neutral-500">This ticket is {activeTicket.status.toLowerCase()}. <button onClick={() => { setActiveTicket(null); fetchTickets(email); }} className="text-[#22c55e] hover:underline">Create a new issue</button></p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  className="input-field flex-1 py-2.5"
                  id="chat-input"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-all disabled:opacity-40 flex items-center gap-1.5 active:scale-95"
                  id="chat-send-btn"
                >
                  {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Previous tickets */}
        <PreviousTickets
          tickets={previousTickets}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          expandedHistoryId={expandedHistoryId}
          setExpandedHistoryId={setExpandedHistoryId}
          handleAutoResponseFeedback={handleAutoResponseFeedback}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  //  VIEW 2 — New Issue Form
  // ──────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <PortalHeader email={email} onLogout={handleLogout} />

      {/* Tab Bar */}
      <div className="flex gap-1 mt-6 mb-6 bg-[#171717] border border-[#2a2a2a] rounded-xl p-1">
        <button
          onClick={() => setActiveTab('new-issue')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150 ${
            activeTab === 'new-issue'
              ? 'bg-white/[.08] text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[.04]'
          }`}
          id="tab-new-issue"
        >
          <Send className="w-4 h-4" />
          New Issue
        </button>
        <button
          onClick={() => setActiveTab('my-tickets')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150 ${
            activeTab === 'my-tickets'
              ? 'bg-white/[.08] text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[.04]'
          }`}
          id="tab-my-tickets"
        >
          <FileText className="w-4 h-4" />
          My Tickets
          {tickets.length > 0 && (
            <span className="ml-1 text-[10px] font-semibold bg-[#22c55e]/20 text-[#22c55e] px-1.5 py-0.5 rounded-full">
              {tickets.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
        </div>
      ) : activeTab === 'my-tickets' ? (
        /* ── My Tickets Tab ── */
        <InlineMyTickets email={email} onNewIssue={() => setActiveTab('new-issue')} />
      ) : (
        <>
          {/* New Issue Form */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                <Send className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Describe Your Issue</h2>
                <p className="text-xs text-neutral-500">Our AI will analyze and try to resolve it instantly</p>
              </div>
            </div>

            <form onSubmit={handleSubmitIssue} className="glass-card p-6 space-y-5">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">What's going on? *</label>
                <textarea
                  required
                  minLength={10}
                  rows={5}
                  placeholder={`Tell us what's going on — our AI will handle the rest.\n\nExamples:\n• "I forgot my password and cannot login"\n• "My payment failed but money was deducted"\n• "The website is not loading since morning"`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field resize-none"
                  id="issue-description"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  Attachment
                  <span className="ml-1.5 text-xs text-neutral-500 font-normal">(optional)</span>
                </label>

                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" id="issue-attachment" onChange={(e) => handleFileSelect(e.target.files[0])} />

                {!uploadedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    className={`cursor-pointer rounded-lg border border-dashed transition-all px-3 py-2 flex items-center gap-2.5 ${
                      dragOver
                        ? 'border-[#22c55e]/50 bg-[#22c55e]/5'
                        : 'border-[#2a2a2a] hover:border-[#22c55e]/30 bg-[#0f0f0f]/50'
                    }`}
                  >
                    <UploadCloud className={`w-4 h-4 flex-shrink-0 ${dragOver ? 'text-[#22c55e]' : 'text-neutral-600'}`} />
                    <span className="text-xs text-neutral-400">
                      <span className="text-[#22c55e] font-medium">Click to upload</span> or drag & drop
                    </span>
                    <span className="ml-auto text-[10px] text-neutral-600">PNG, JPG, PDF · 5MB</span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#171717] p-3 flex items-center gap-3">
                    {uploadedFile.preview ? (
                      <img src={uploadedFile.preview} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-[#2a2a2a] flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#22c55e]/10 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-[#22c55e]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-neutral-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={handleRemoveFile} className="p-1.5 rounded-lg hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                id="submit-issue-btn"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> AI Analyzing...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Submit Query</>
                )}
              </button>
            </form>
          </div>

          {/* FAQ */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
                <p className="text-xs text-neutral-500">Quick answers before submitting</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {FAQ_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className={`glass-card overflow-hidden transition-all duration-200 ${
                    openFaq === idx ? 'ring-1 ring-[#22c55e]/20' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                        openFaq === idx ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-white/5 text-neutral-500 group-hover:bg-[#22c55e]/10 group-hover:text-[#22c55e]'
                      }`}>{idx + 1}</span>
                      <span className={`text-sm ${openFaq === idx ? 'text-[#22c55e] font-medium' : 'text-neutral-300'}`}>{item.q}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-[#22c55e]' : 'text-neutral-600'}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-4">
                      <div className="ml-7.5 pl-3 border-l-2 border-[#22c55e]/20">
                        <p className="text-sm text-neutral-400 leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Previous tickets */}
          <PreviousTickets
            tickets={previousTickets}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            expandedHistoryId={expandedHistoryId}
            setExpandedHistoryId={setExpandedHistoryId}
            handleAutoResponseFeedback={handleAutoResponseFeedback}
          />
        </>
      )}
    </div>
  );
}


// ────────────────────────────────────────────────────────────
//  Sub-components
// ────────────────────────────────────────────────────────────

function PortalHeader({ email, onLogout }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">User Portal</h1>
        <p className="text-sm text-neutral-500 flex items-center gap-1.5 mt-0.5">
          <Mail className="w-3.5 h-3.5" /> {email}
        </p>
      </div>
      <button
        onClick={onLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-[#2a2a2a] text-neutral-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        Switch User
      </button>
    </div>
  );
}


function PreviousTickets({ tickets, showHistory, setShowHistory, expandedHistoryId, setExpandedHistoryId, handleAutoResponseFeedback }) {
  if (tickets.length === 0) return null;

  return (
    <div className="mt-8 mb-6">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between px-4 py-3 glass-card hover:bg-white/[.02] transition-colors"
      >
        <span className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-500" />
          Previous Tickets ({tickets.length})
        </span>
        {showHistory ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
      </button>

      {showHistory && (
        <div className="mt-2 space-y-2">
          {tickets.map(ticket => (
            <div key={ticket.id} className="glass-card overflow-hidden">
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-white/[.02] transition-colors flex items-start justify-between gap-3"
                onClick={() => setExpandedHistoryId(expandedHistoryId === ticket.id ? null : ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-mono text-[#22c55e]">#{ticket.id}</span>
                    <span className={getStatusBadge(ticket.status)}>{ticket.status}</span>
                    <span className={getSeverityBadge(ticket.severity)}>{ticket.severity}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{ticket.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1">
                    <span>{fmtDateFull(ticket.created_at)}</span>
                    {ticket.estimated_resolution_time && <span>Est. {ticket.estimated_resolution_time}</span>}
                  </div>
                </div>
                {expandedHistoryId === ticket.id ? <ChevronUp className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-1" />}
              </div>

              {/* Expanded */}
              {expandedHistoryId === ticket.id && (
                <div className="border-t border-[#2a2a2a] bg-[#0f0f0f]/50 p-4 space-y-4">
                  {/* Description */}
                  <div className="bg-[#171717] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 font-semibold">Your Query</p>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap">{ticket.description}</p>
                  </div>

                  {/* AI Analysis */}
                  {ticket.category && (
                    <div className="bg-[#171717] rounded-lg p-3 border border-[#2a2a2a]">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2 font-semibold">AI Analysis</p>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-neutral-500">Category</p>
                          <p className="text-white font-medium">{ticket.category}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Sentiment</p>
                          <p className="text-white font-medium">{ticket.sentiment}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Confidence</p>
                          <p className="text-white font-medium">{Math.round((ticket.confidence_score || 0) * 100)}%</p>
                        </div>
                      </div>
                      {ticket.ai_summary && (
                        <div className="mt-2 pt-2 border-t border-[#2a2a2a]">
                          <p className="text-xs text-neutral-400">{ticket.ai_summary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-response */}
                  {ticket.auto_resolved && ticket.auto_response && (
                    <div className="bg-[#22c55e]/5 rounded-lg p-3 border border-[#22c55e]/20">
                      <p className="text-xs font-semibold text-[#22c55e] mb-1">AI Auto-Resolution</p>
                      <p className="text-sm text-neutral-300 whitespace-pre-wrap">{ticket.auto_response}</p>
                    </div>
                  )}

                  {/* Replies */}
                  {ticket.replies && ticket.replies.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">Conversation</p>
                      {ticket.replies.map(r => (
                        <div key={r.id} className={`flex gap-2 ${r.is_employee_reply ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            r.is_employee_reply ? 'bg-purple-500/20' : 'bg-white/10'
                          }`}>
                            {r.is_employee_reply ? <Users className="w-3 h-3 text-purple-400" /> : <User className="w-3 h-3 text-neutral-400" />}
                          </div>
                          <div className={`rounded-lg p-3 max-w-[80%] ${
                            r.is_employee_reply ? 'bg-[#171717] border border-[#2a2a2a]' : 'bg-white/5'
                          }`}>
                            <p className={`text-xs font-semibold mb-1 ${r.is_employee_reply ? 'text-purple-400' : 'text-neutral-400'}`}>{r.author_name}</p>
                            <p className="text-sm text-neutral-200">{r.content}</p>
                            <p className="text-[10px] text-neutral-600 mt-1">{fmtDateFull(r.created_at)}</p>
                          </div>
                        </div>
                      ))}
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


// ────────────────────────────────────────────────────────────
//  InlineMyTickets — My Tickets tab rendered inside UserPortal
// ────────────────────────────────────────────────────────────

function InlineMyTickets({ email, onNewIssue }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [searched, setSearched] = useState(false);

  const fetchMyTickets = useCallback(async (em) => {
    if (!em) return;
    setLoading(true);
    try {
      const data = await ticketApi.listByEmail(em);
      setTickets(data);
      setSearched(true);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (email) fetchMyTickets(email);
  }, [email, fetchMyTickets]);

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
      fetchMyTickets(email);
    } catch (err) { alert(err.message); }
  };

  const handleAutoResponseFeedback = async (ticketId, isHelpful) => {
    try {
      await ticketApi.submitFeedback(ticketId, { ticket_id: ticketId, is_helpful: isHelpful });
      fetchMyTickets(email);
    } catch (err) { alert(err.message); }
  };

  const getSeverityClass = (s) => {
    const m = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
    return `badge ${m[s] || 'badge-medium'}`;
  };
  const getStatusClass = (s) => {
    const m = {
      New: 'badge-status-open', Assigned: 'badge-status-progress', 'In Progress': 'badge-status-progress',
      'Pending Info': 'badge-status-progress', Resolved: 'badge-status-resolved', Closed: 'badge-status-closed',
    };
    return `badge ${m[s] || 'badge-status-open'}`;
  };
  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const stats = {
    total: tickets.length,
    resolved: tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length,
    inProgress: tickets.filter(t => ['Assigned', 'In Progress'].includes(t.status)).length,
    pending: tickets.filter(t => ['New', 'Pending Info'].includes(t.status)).length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
      </div>
    );
  }

  if (searched && tickets.length === 0) {
    return (
      <div className="glass-card p-16 text-center animate-fade-in">
        <Inbox className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
        <p className="text-neutral-400 text-lg font-medium mb-1">No tickets found</p>
        <p className="text-neutral-600 text-sm mb-6">You haven't submitted any tickets yet.</p>
        <button onClick={onNewIssue} className="btn-primary">Create New Ticket</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Stats */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Resolved', value: stats.resolved, color: 'text-blue-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-yellow-400' },
            { label: 'Pending', value: stats.pending, color: 'text-neutral-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4">
              <p className="text-[11px] text-neutral-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ticket list */}
      {tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="glass-card overflow-hidden">
              {/* Row header */}
              <div
                className="p-4 cursor-pointer hover:bg-white/[.02] transition-colors flex items-start justify-between gap-4"
                onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-xs font-mono text-[#22c55e]">#{ticket.id}</span>
                    <span className={getStatusClass(ticket.status)}>{ticket.status}</span>
                    <span className={getSeverityClass(ticket.severity)}>{ticket.severity}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate mb-1">{ticket.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmt(ticket.created_at)}</span>
                    {ticket.estimated_resolution_time && <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />Est. {ticket.estimated_resolution_time}</span>}
                  </div>
                </div>
                {expandedId === ticket.id
                  ? <ChevronUp className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-1" />
                  : <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-1" />
                }
              </div>

              {/* Expanded body */}
              {expandedId === ticket.id && (
                <div className="border-t border-[#2a2a2a] bg-[#0f0f0f]/50 p-5 space-y-4">
                  {/* Description */}
                  <div className="bg-[#171717] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1.5 font-semibold">Your Query</p>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap">{ticket.description}</p>
                  </div>

                  {/* AI analysis */}
                  {ticket.category && (
                    <div className="bg-[#171717] rounded-lg p-3 border border-[#2a2a2a]">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2 font-semibold">AI Analysis</p>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div><p className="text-neutral-500 mb-0.5">Category</p><p className="text-white font-medium">{ticket.category}</p></div>
                        <div><p className="text-neutral-500 mb-0.5">Sentiment</p><p className="text-white font-medium">{ticket.sentiment}</p></div>
                        <div><p className="text-neutral-500 mb-0.5">Confidence</p><p className="text-white font-medium">{Math.round((ticket.confidence_score || 0) * 100)}%</p></div>
                      </div>
                      {ticket.ai_summary && (
                        <div className="mt-2 pt-2 border-t border-[#2a2a2a]">
                          <p className="text-xs text-neutral-400">{ticket.ai_summary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-response */}
                  {ticket.auto_resolved && ticket.auto_response && (
                    <div className="bg-[#22c55e]/5 rounded-lg p-4 border border-[#22c55e]/20">
                      <p className="text-xs font-semibold text-[#22c55e] mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Auto-Resolution
                      </p>
                      <p className="text-sm text-neutral-300 whitespace-pre-wrap mb-4">{ticket.auto_response}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-500">Did this resolve your issue?</span>
                        <button onClick={() => handleAutoResponseFeedback(ticket.id, true)} className="text-xs py-1 px-3 rounded-lg bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 border border-[#22c55e]/30 transition-colors">
                          <Check className="w-3 h-3 inline mr-1" />Yes
                        </button>
                        <button onClick={() => handleAutoResponseFeedback(ticket.id, false)} className="text-xs py-1 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors">
                          No, need help
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {ticket.replies && ticket.replies.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">Conversation</p>
                      {ticket.replies.map(r => (
                        <div key={r.id} className={`flex gap-3 ${!r.is_employee_reply ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${r.is_employee_reply ? 'bg-purple-500/20 border-purple-500/30' : 'bg-white/10 border-white/10'}`}>
                            {r.is_employee_reply ? <Users className="w-3.5 h-3.5 text-purple-400" /> : <User className="w-3.5 h-3.5 text-neutral-400" />}
                          </div>
                          <div className={`rounded-xl p-3 max-w-[82%] border ${r.is_employee_reply ? 'bg-[#171717] border-[#2a2a2a]' : 'bg-white/5 border-white/5'}`}>
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <span className={`text-xs font-semibold ${r.is_employee_reply ? 'text-purple-400' : 'text-neutral-400'}`}>{r.author_name}</span>
                              <span className="text-[10px] text-neutral-600">{fmt(r.created_at)}</span>
                            </div>
                            <p className="text-sm text-neutral-200 whitespace-pre-wrap">{r.content}</p>
                            {r.is_employee_reply && r.feedback_helpful === null && !['Resolved', 'Closed'].includes(ticket.status) && (
                              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                                <span className="text-xs text-neutral-500">Satisfied with this?</span>
                                <button onClick={() => handleFeedback(ticket.id, r.id, true)} className="text-xs py-1 px-2.5 rounded-md bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 border border-[#22c55e]/30 transition-colors">
                                  <Check className="w-3 h-3 inline mr-1" />Yes, close
                                </button>
                                <button onClick={() => handleFeedback(ticket.id, r.id, false)} className="text-xs py-1 px-2.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors">
                                  No, more help
                                </button>
                              </div>
                            )}
                            {r.is_employee_reply && r.feedback_helpful !== null && (
                              <div className="mt-2 text-[10px]">
                                {r.feedback_helpful
                                  ? <span className="text-[#22c55e] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Marked as helpful</span>
                                  : <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Escalated</span>
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {!['Resolved', 'Closed'].includes(ticket.status) && (
                    <div className="pt-3 border-t border-[#2a2a2a]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input-field flex-1 py-2.5"
                          placeholder="Reply to agent..."
                          value={replyText[ticket.id] || ''}
                          onChange={e => setReplyText({ ...replyText, [ticket.id]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') handleUserReply(ticket.id); }}
                        />
                        <button
                          onClick={() => handleUserReply(ticket.id)}
                          disabled={!replyText[ticket.id]}
                          className="px-4 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-all disabled:opacity-40 active:scale-95"
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
