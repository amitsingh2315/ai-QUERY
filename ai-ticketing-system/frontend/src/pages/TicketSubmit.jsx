/**
 * TicketSubmit Page — Module 1: Ticket Intake Form
 * Submits ticket → AI analysis → shows result
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Loader2, CheckCircle2, AlertTriangle, ImageIcon, X, UploadCloud, ChevronDown, HelpCircle } from 'lucide-react';
import { ticketApi } from '../api.js';

export default function TicketSubmit() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ description: '', user_email: localStorage.getItem('userEmail') || '', attachment_url: '' });
  const [uploadedFile, setUploadedFile] = useState(null); // { name, preview, size }
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const FAQ_ITEMS = [
    {
      q: 'How do I reset my account password?',
      a: 'Go to the login page and click "Forgot Password". Enter your registered email address and follow the reset link sent to your inbox. If you don\'t see it, check your spam folder.',
    },
    {
      q: 'My payment failed but money was deducted. What should I do?',
      a: 'Sometimes banks take a few minutes to confirm transactions. Please wait 10–15 minutes. If the order is still not created, the deducted amount will be automatically refunded within 3–5 business days. No action is required from your side.',
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
      q: 'I submitted a ticket but haven\'t received a response. What should I do?',
      a: 'Support teams usually respond within the estimated resolution time shown on your ticket. You can check the real-time status of your ticket in the "My Tickets" section. If it\'s been longer than expected, you can reply directly on the ticket to follow up.',
    },
    {
      q: 'Can I attach a screenshot or document to my ticket?',
      a: 'Yes! Use the "Upload Screenshot / Document" field on the Submit Ticket form to attach an image (PNG, JPG, GIF, WebP) or PDF up to 5MB. This helps our team resolve your issue faster.',
    },
    {
      q: 'How does the AI automatically analyze my ticket?',
      a: 'When you submit a ticket, our AI instantly reads your description and automatically detects the category (e.g., Access, Payment, Technical), priority level, and estimated resolution time. It then routes your ticket to the right team or resolves it automatically if a known solution exists.',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const ticket = await ticketApi.create({
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

  const handleFileSelect = (file) => {
    if (!file) return;
    // Validate type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Only images (PNG, JPG, GIF, WebP) and PDFs are allowed.');
      return;
    }
    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({ name: file.name, size: file.size, preview: file.type.startsWith('image/') ? e.target.result : null });
      setForm(prev => ({ ...prev, attachment_url: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setForm(prev => ({ ...prev, attachment_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            <button onClick={() => { setResult(null); setForm({ ...form, description: '', attachment_url: '' }); }} className="btn-secondary">
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Describe your issue *</label>
            <textarea
              required
              minLength={10}
              rows={6}
              placeholder={`Tell us what's going on — our AI will handle the rest.\n\nExamples:\n• "I forgot my password and cannot login to my account"\n• "My payment failed but money was deducted"\n• "The website is not loading since morning"`}
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
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Upload Screenshot / Document
              <span className="ml-1.5 text-xs text-gray-500 font-normal">(optional)</span>
            </label>

            {/* Hidden real file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              id="ticket-attachment"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />

            {!uploadedFile ? (
              /* Drop Zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 p-6 text-center
                  ${ dragOver
                    ? 'border-primary-400 bg-primary-500/10 scale-[1.01]'
                    : 'border-white/10 hover:border-primary-500/50 hover:bg-white/3 bg-surface-900/30'
                  }`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 transition-colors ${ dragOver ? 'text-primary-400' : 'text-gray-500' }`} />
                <p className="text-sm text-gray-400">
                  <span className="text-primary-400 font-medium">Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-gray-600 mt-1">PNG, JPG, GIF, WebP, PDF — max 5MB</p>
              </div>
            ) : (
              /* File Preview */
              <div className="rounded-xl border border-white/10 bg-surface-900/40 p-4 flex items-center gap-4">
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt="preview"
                    className="w-16 h-16 rounded-lg object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-primary-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-emerald-400 mt-1">✓ Ready to attach</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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

      {/* ─── General FAQ Section ─────────────────────────────── */}
      <div className="mt-10 animate-fade-in">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">General FAQ</h2>
            <p className="text-xs text-gray-500">Most Frequently Asked Questions — find quick answers before submitting</p>
          </div>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className={`glass-card overflow-hidden transition-all duration-200 ${
                openFaq === idx ? 'ring-1 ring-primary-500/30 shadow-md shadow-primary-500/5' : 'hover:border-white/10'
              }`}
            >
              {/* Question Row */}
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left group"
                id={`faq-btn-${idx}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    openFaq === idx
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-white/5 text-gray-500 group-hover:bg-primary-500/10 group-hover:text-primary-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={`text-sm font-medium transition-colors ${
                    openFaq === idx ? 'text-primary-300' : 'text-gray-200 group-hover:text-white'
                  }`}>
                    {item.q}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${
                    openFaq === idx ? 'rotate-180 text-primary-400' : 'text-gray-600 group-hover:text-gray-400'
                  }`}
                />
              </button>

              {/* Answer Panel */}
              {openFaq === idx && (
                <div className="px-5 pb-5 pt-0">
                  <div className="ml-9 pl-4 border-l-2 border-primary-500/30">
                    <p className="text-sm text-gray-400 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          Still have a question? Use the form above to submit a support ticket — our AI will route it instantly.
        </p>
      </div>

    </div>
  );
}
