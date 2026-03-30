/**
 * TicketSubmit Page — Module 1: Ticket Intake Form
 * Submits ticket → AI analysis → shows result
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Loader2, CheckCircle2, AlertTriangle, Paperclip } from 'lucide-react';
import { ticketApi } from '../api.js';

export default function TicketSubmit() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', user_email: localStorage.getItem('userEmail') || '', attachment_url: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const ticket = await ticketApi.create({
        title: form.title,
        description: form.description,
        user_email: form.user_email,
        attachment_url: form.attachment_url || null,
      });
      setResult(ticket);
      localStorage.setItem('userEmail', form.user_email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    const map = {
      'Critical': 'badge-critical',
      'High': 'badge-high',
      'Medium': 'badge-medium',
      'Low': 'badge-low',
    };
    return `badge ${map[severity] || 'badge-medium'}`;
  };

  const getStatusBadge = (status) => {
    const map = {
      'New': 'badge-new', 'Assigned': 'badge-assigned', 'In Progress': 'badge-in-progress',
      'Pending Info': 'badge-pending', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed',
    };
    return `badge ${map[status] || 'badge-new'}`;
  };

  if (result) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="glass-card p-8">
          {/* Success Header */}
          <div className="flex items-center gap-3 mb-6">
            {result.auto_resolved ? (
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {result.auto_resolved ? 'Ticket Auto-Resolved!' : 'Ticket Submitted & Assigned'}
              </h2>
              <p className="text-sm text-gray-400">Ticket #{result.id}</p>
            </div>
          </div>

          {/* AI Analysis Card */}
          <div className="bg-surface-900/60 rounded-xl p-6 mb-6 border border-white/5">
            <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <p className="text-sm font-medium text-white">{result.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Severity</p>
                <span className={getSeverityBadge(result.severity)}>{result.severity}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className={getStatusBadge(result.status)}>{result.status}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Sentiment</p>
                <p className="text-sm font-medium text-white">{result.sentiment}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Confidence</p>
                <p className="text-sm font-medium text-white">{Math.round((result.confidence_score || 0) * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Est. Resolution</p>
                <p className="text-sm font-medium text-white">{result.estimated_resolution_time}</p>
              </div>
            </div>
            {result.ai_summary && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-1">AI Summary</p>
                <p className="text-sm text-gray-300">{result.ai_summary}</p>
              </div>
            )}
          </div>

          {/* Auto-resolved response */}
          {result.auto_resolved && result.auto_response && (
            <div className="bg-emerald-500/5 rounded-xl p-6 mb-6 border border-emerald-500/20">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3">Auto-Resolution Response</h3>
              <p className="text-sm text-gray-300 whitespace-pre-line">{result.auto_response}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={async () => {
                    await ticketApi.submitFeedback(result.id, { ticket_id: result.id, is_helpful: true });
                    alert('Thank you for your feedback!');
                  }}
                  className="btn-success text-sm py-2 px-4"
                >
                  ✓ Yes, helpful
                </button>
                <button
                  onClick={async () => {
                    await ticketApi.submitFeedback(result.id, { ticket_id: result.id, is_helpful: false });
                    alert('Thank you. Your ticket has been reassigned to a human agent.');
                    navigate(`/tickets/${result.id}`);
                  }}
                  className="btn-danger text-sm py-2 px-4"
                >
                  ✗ No, not helpful
                </button>
              </div>
            </div>
          )}

          {/* Assignment info */}
          {!result.auto_resolved && result.assignee_name && (
            <div className="bg-primary-500/5 rounded-xl p-6 mb-6 border border-primary-500/20">
              <h3 className="text-sm font-semibold text-primary-400 mb-2">Assigned To</h3>
              <p className="text-white font-medium">{result.assignee_name}</p>
              <p className="text-sm text-gray-400">Department: {result.department}</p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate(`/tickets/${result.id}`)} className="btn-primary">
              View Ticket Details
            </button>
            <button onClick={() => navigate(`/my-tickets?email=${encodeURIComponent(form.user_email)}`)} className="btn-secondary flex items-center gap-2">
              View All My Tickets
            </button>
            <button onClick={() => { setResult(null); setForm({ ...form, title: '', description: '', attachment_url: '' }); }} className="btn-secondary">
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Submit a Ticket</h1>
        <p className="text-gray-400">Describe your issue and our AI will analyze and route it instantly.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              placeholder="Brief summary of your issue"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              id="ticket-title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
            <textarea
              required
              minLength={10}
              rows={5}
              placeholder="Describe the issue in detail. Include error messages, steps to reproduce, or any relevant context..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none"
              id="ticket-description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your Email *</label>
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={form.user_email}
              onChange={(e) => setForm({ ...form, user_email: e.target.value })}
              className="input-field"
              id="ticket-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Paperclip className="w-4 h-4 inline mr-1" />
              Upload Document/Screenshot (URL)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.attachment_url}
              onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
              className="input-field"
              id="ticket-attachment"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3 border border-red-500/20">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            id="submit-ticket-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI Analyzing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
