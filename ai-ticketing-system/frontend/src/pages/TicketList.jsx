/**
 * TicketList Page — Module 5: Ticket Listing with Filters & Search
 * Redesigned for a clean, modern SaaS dashboard look (Linear / Zendesk style).
 * All API calls and logic are unchanged.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Clock, Loader2, RefreshCw, MessageSquare,
  X, Send, ChevronRight, User, Tag, Inbox, SlidersHorizontal,
  Sparkles, AlertTriangle
} from 'lucide-react';
import { ticketApi } from '../api.js';

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUSES   = ['', 'New', 'Assigned', 'In Progress', 'Pending Info', 'Resolved', 'Closed'];
const SEVERITIES = ['', 'Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = ['', 'Billing', 'Bug', 'Access', 'HR', 'Server', 'DB', 'Feature', 'Other'];

// ─── Status config: label + color system ───────────────────────────────────
const STATUS_CONFIG = {
  'New':          { label: 'OPEN',        color: 'badge-status-open' },
  'Assigned':     { label: 'IN PROGRESS', color: 'badge-status-progress' },
  'In Progress':  { label: 'IN PROGRESS', color: 'badge-status-progress' },
  'Pending Info': { label: 'IN PROGRESS', color: 'badge-status-progress' },
  'Resolved':     { label: 'RESOLVED',    color: 'badge-status-resolved' },
  'Closed':       { label: 'CLOSED',      color: 'badge-status-closed' },
};

// ─── Severity config ───────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  'Critical': { color: 'text-red-400    bg-red-400/10    border-red-400/25' },
  'High':     { color: 'text-orange-400 bg-orange-400/10 border-orange-400/25' },
  'Medium':   { color: 'text-amber-400  bg-amber-400/10  border-amber-400/25' },
  'Low':      { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' },
};

const getStatusCfg = (s) => STATUS_CONFIG[s] || STATUS_CONFIG['New'];
const getSeverityCfg = (s) => SEVERITY_CONFIG[s] || SEVERITY_CONFIG['Medium'];

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = getStatusCfg(status);
  return (
    <span className={`badge ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function SeverityPill({ severity }) {
  const cfg = getSeverityCfg(severity);
  return (
    <span className={`badge ${cfg.color}`}>
      {severity}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function TicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ status: '', severity: '', category: '', department: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [replyModal, setReplyModal] = useState({ show: false, ticket: null, text: '', loading: false });

  // ─── API ─────────────────────────────────────────────────────────────────
  const pollRef = useRef(null);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await ticketApi.list(filters);
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchTickets(false);
  }, []);

  // 5-second live poll for new tickets and status changes
  useEffect(() => {
    pollRef.current = setInterval(() => fetchTickets(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchTickets]);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyModal.text.trim() || !replyModal.ticket) return;
    setReplyModal(prev => ({ ...prev, loading: true }));
    try {
      await ticketApi.addReply(replyModal.ticket.id, {
        author_email: 'admin@company.com',
        author_name: 'Support Agent',
        content: replyModal.text,
        is_employee_reply: true,
      });
      alert('Reply sent successfully!');
      setReplyModal({ show: false, ticket: null, text: '', loading: false });
      fetchTickets(false);
    } catch (err) {
      alert(err.message);
      setReplyModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFilter = () => fetchTickets(false);

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = {
    open:       tickets.filter(t => ['New', 'Assigned'].includes(t.status)).length,
    inProgress: tickets.filter(t => ['In Progress', 'Pending Info'].includes(t.status)).length,
    closed:     tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length,
    critical:   tickets.filter(t => t.severity === 'Critical').length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="h2 mb-1">Tickets</h1>
          <p className="body-text">{tickets.length} tickets total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            className="p-2 rounded-lg border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              showFilters
                ? 'bg-primary-600/20 text-primary-400 border-primary-500/30'
                : 'text-gray-400 hover:text-white border-white/5 hover:bg-white/5'
            }`}
            id="toggle-filters-btn"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Open',        value: stats.open,        color: 'text-blue-400',    border: 'border-blue-500/15',    bg: 'from-blue-600/8' },
          { label: 'In Progress', value: stats.inProgress,  color: 'text-amber-400',   border: 'border-amber-500/15',   bg: 'from-amber-600/8' },
          { label: 'Closed',      value: stats.closed,      color: 'text-emerald-400', border: 'border-emerald-500/15', bg: 'from-emerald-600/8' },
          { label: 'Critical',    value: stats.critical,    color: 'text-red-400',     border: 'border-red-500/15',     bg: 'from-red-600/8' },
        ].map(s => (
          <div key={s.label} className={`glass-card p-4 bg-gradient-to-br ${s.bg} to-transparent ${s.border}`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search Bar (always visible) ─────────────────────────────────── */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search tickets by title, email, category..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
          className="input-field pl-11 pr-4 py-3 text-sm w-full"
          id="filter-search"
        />
      </div>

      {/* ── Filters Panel ─────────────────────────────────────────────── */}
      {showFilters && (
        <div className="glass-card p-5 mb-5 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-field text-sm py-2"
                id="filter-status"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="input-field text-sm py-2"
                id="filter-severity"
              >
                {SEVERITIES.map(s => <option key={s} value={s}>{s || 'All Severities'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="input-field text-sm py-2"
                id="filter-category"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleFilter} className="btn-primary text-sm py-2 px-6">
              Apply Filters
            </button>
            <button
              onClick={() => { setFilters({ status: '', severity: '', category: '', department: '', search: '' }); }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* ── Ticket List ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-card text-center py-16">
          <Inbox className="w-12 h-12 text-[#A1A1A1] mx-auto mb-4 opacity-50" />
          <h3 className="h3 text-white mb-2">No tickets available</h3>
          <p className="body-text">You don't have any tickets matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket, index) => {
            const isCritical = ticket.severity === 'Critical';
            const isClosed = ['Resolved', 'Closed'].includes(ticket.status);
            return (
              <div
                key={ticket.id}
                className={`glass-card-hover flex items-center justify-between mb-4`}
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                id={`ticket-row-${ticket.id}`}
              >
                {/* ── Left: Main info ────────────────────────── */}
                <div className="flex-1 min-w-0 pr-4">
                  {/* Title row */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-[#A1A1A1]">#{ticket.id}</span>
                    <h3 className="font-semibold text-white text-base truncate">
                      {ticket.title}
                    </h3>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-sm text-[#A1A1A1] flex-wrap">
                    {ticket.department && (
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> {ticket.department}
                      </span>
                    )}
                    {ticket.category && !ticket.department && (
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> {ticket.category}
                      </span>
                    )}
                    {ticket.assignee_name && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> {ticket.assignee_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </div>

                {/* ── Right: Status Badge ───────────────────── */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <StatusPill status={ticket.status} />
                  <ChevronRight className="w-5 h-5 text-[#A1A1A1] hidden sm:block opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reply Modal ────────────────────────────────────────────────── */}
      {replyModal.show && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setReplyModal({ show: false, ticket: null, text: '', loading: false })}
        >
          <div
            className="glass-card p-6 w-full max-w-lg shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Send Reply</h3>
                  <p className="text-xs text-gray-500">to {replyModal.ticket?.user_email}</p>
                </div>
              </div>
              <button
                onClick={() => setReplyModal({ show: false, ticket: null, text: '', loading: false })}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket context */}
            <div className="mb-4 p-3 rounded-xl bg-surface-900/60 border border-white/5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Ticket</p>
              <p className="text-sm font-medium text-white">{replyModal.ticket?.title}</p>
            </div>

            {/* Reply form */}
            <form onSubmit={handleReplySubmit}>
              <textarea
                autoFocus
                required
                rows={5}
                className="input-field resize-none w-full mb-4 py-3 text-sm"
                placeholder="Type your reply to the user..."
                value={replyModal.text}
                onChange={e => setReplyModal(prev => ({ ...prev, text: e.target.value }))}
                disabled={replyModal.loading}
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setReplyModal({ show: false, ticket: null, text: '', loading: false })}
                  className="btn-secondary text-sm py-2 px-4"
                  disabled={replyModal.loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2 text-sm py-2 px-6"
                  disabled={replyModal.loading}
                >
                  {replyModal.loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
