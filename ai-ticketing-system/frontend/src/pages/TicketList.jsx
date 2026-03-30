/**
 * TicketList Page — Module 5: Ticket Listing with Filters & Search
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Clock, Loader2, RefreshCw, MessageSquare, X, Send } from 'lucide-react';
import { ticketApi } from '../api.js';

const STATUSES = ['', 'New', 'Assigned', 'In Progress', 'Pending Info', 'Resolved', 'Closed'];
const SEVERITIES = ['', 'Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = ['', 'Billing', 'Bug', 'Access', 'HR', 'Server', 'DB', 'Feature', 'Other'];

export default function TicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', severity: '', category: '', department: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [replyModal, setReplyModal] = useState({ show: false, ticket: null, text: '', loading: false });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketApi.list(filters);
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

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
      fetchTickets();
    } catch (err) {
      alert(err.message);
      setReplyModal(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleFilter = () => { fetchTickets(); };

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-1">All Tickets</h1>
          <p className="text-gray-400 text-sm">{tickets.length} tickets found</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchTickets} className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-card p-6 mb-6 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
              <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="input-field text-sm py-2" id="filter-status">
                {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Severity</label>
              <select value={filters.severity} onChange={(e) => setFilters({...filters, severity: e.target.value})} className="input-field text-sm py-2" id="filter-severity">
                {SEVERITIES.map(s => <option key={s} value={s}>{s || 'All Severities'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
              <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} className="input-field text-sm py-2" id="filter-category">
                {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="input-field text-sm py-2 pl-10"
                  id="filter-search"
                />
              </div>
            </div>
          </div>
          <button onClick={handleFilter} className="btn-primary text-sm py-2 px-6">Apply Filters</button>
        </div>
      )}

      {/* Ticket List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-400 text-lg">No tickets found</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or submit a new ticket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, index) => (
            <div
              key={ticket.id}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              className="glass-card-hover cursor-pointer p-5 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
              id={`ticket-row-${ticket.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-500 font-mono">#{ticket.id}</span>
                    <span className={getSeverityClass(ticket.severity)}>{ticket.severity}</span>
                    <span className={getStatusClass(ticket.status)}>{ticket.status}</span>
                    {ticket.auto_resolved && (
                      <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">AI Resolved</span>
                    )}
                    {ticket.escalated && (
                      <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">Escalated</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold truncate">{ticket.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{ticket.category}</span>
                    {ticket.department && <span>• {ticket.department}</span>}
                    {ticket.assignee_name && <span>• {ticket.assignee_name}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center gap-3 border-l border-white/5 pl-4 ml-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setReplyModal({ show: true, ticket: ticket, text: '', loading: false }); }}
                    className="bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs py-1.5 px-3 flex items-center gap-1.5 w-full justify-center shadow-lg shadow-primary-500/20 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Reply User
                  </button>
                  <div className="text-gray-500 flex items-center gap-1 hover:text-white transition-colors text-xs font-medium">
                    View <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReplyModal({ show: false, ticket: null, text: '', loading: false })}>
          <div className="glass-card p-6 w-full max-w-lg shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-400" /> Reply to User
              </h3>
              <button onClick={() => setReplyModal({ show: false, ticket: null, text: '', loading: false })} className="p-1 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 bg-surface-900/50 p-3 rounded-xl border border-white/5">
              <p className="text-xs text-gray-500 mb-1">Replying to ticket:</p>
              <p className="text-sm font-medium text-white">{replyModal.ticket?.title}</p>
            </div>
            <form onSubmit={handleReplySubmit}>
              <textarea
                autoFocus
                required
                rows={5}
                className="input-field resize-none w-full mb-4 align-top py-3"
                placeholder={`Type your reply to ${replyModal.ticket?.user_email}...`}
                value={replyModal.text}
                onChange={e => setReplyModal(prev => ({ ...prev, text: e.target.value }))}
                disabled={replyModal.loading}
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setReplyModal({ show: false, ticket: null, text: '', loading: false })} className="btn-secondary text-sm py-2 px-4" disabled={replyModal.loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2 text-sm py-2 px-6" disabled={replyModal.loading}>
                  {replyModal.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
