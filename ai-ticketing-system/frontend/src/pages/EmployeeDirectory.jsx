/**
 * EmployeeDirectory Page — Module 4: Employee management admin page
 * Enhanced with active ticket tracking, smart sorting, and quick navigation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Edit3, UserX, Loader2, X, Check, Search, Users,
  ExternalLink, Ticket, AlertCircle
} from 'lucide-react';
import { employeeApi } from '../api.js';

const DEPARTMENTS = ['Engineering', 'DevOps', 'IT', 'HR', 'Finance', 'Product', 'Legal', 'Marketing'];
const AVAILABILITY = ['Available', 'Busy', 'On Leave'];

const emptyForm = {
  name: '', email: '', department: 'Engineering', role: '',
  skill_tags: '', avg_resolution_time: 0, current_ticket_load: 0, availability: 'Available'
};

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [activeTickets, setActiveTickets] = useState({}); // Map<employee_id → ticket_info>
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');

  const pollRef = useRef(null);

  // silent=true → skips the loading spinner (used by the background poll)
  const fetchEmployees = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [data, tickets] = await Promise.all([
        employeeApi.list({ department: filterDept, active_only: true }),
        employeeApi.activeTickets(),
      ]);
      setEmployees(data);

      // Build map: employee_id → active ticket info
      const ticketMap = {};
      tickets.forEach(t => {
        ticketMap[t.employee_id] = t;
      });
      setActiveTickets(ticketMap);
    } catch (err) { console.error(err); }
    finally { if (!silent) setLoading(false); }
  }, [filterDept]);

  // Initial load + 4-second live poll
  useEffect(() => {
    fetchEmployees(false);           // first load with spinner
    pollRef.current = setInterval(() => fetchEmployees(true), 4000); // silent poll
    return () => clearInterval(pollRef.current);  // cleanup on unmount / filter change
  }, [fetchEmployees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await employeeApi.update(editingId, form);
      } else {
        await employeeApi.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      fetchEmployees();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (emp) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name, email: emp.email, department: emp.department, role: emp.role,
      skill_tags: emp.skill_tags, avg_resolution_time: emp.avg_resolution_time,
      current_ticket_load: emp.current_ticket_load, availability: emp.availability,
    });
    setShowForm(true);
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try {
      await employeeApi.deactivate(id);
      fetchEmployees();
    } catch (err) { alert(err.message); }
  };

  const handleViewTicket = (ticketId) => {
    navigate(`/tickets/${ticketId}?scroll=agent-response`);
  };

  // ─── Availability color logic ─────────────────────────────
  const getAvailabilityColor = (emp) => {
    if (activeTickets[emp.id]) return 'bg-red-500';     // Active ticket = Red
    if (emp.availability === 'Busy') return 'bg-amber-500';  // Busy = Orange
    if (emp.availability === 'On Leave') return 'bg-gray-500';
    return 'bg-emerald-500'; // Available = Green
  };

  const getAvailabilityLabel = (emp) => {
    if (activeTickets[emp.id]) return 'Active Ticket';
    return emp.availability;
  };

  const getAvailabilityTextColor = (emp) => {
    if (activeTickets[emp.id]) return 'text-red-400';
    if (emp.availability === 'Busy') return 'text-amber-400';
    if (emp.availability === 'On Leave') return 'text-gray-400';
    return 'text-emerald-400';
  };

  // ─── Sorting Logic ────────────────────────────────────────
  // Priority: 1) Active ticket  2) Highest load  3) Available  4) Idle/On Leave
  const sortEmployees = (list) => {
    return [...list].sort((a, b) => {
      const aActive = activeTickets[a.id] ? 1 : 0;
      const bActive = activeTickets[b.id] ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive; // Active first

      if (a.current_ticket_load !== b.current_ticket_load)
        return b.current_ticket_load - a.current_ticket_load; // Higher load first

      const availOrder = { 'Available': 0, 'Busy': 1, 'On Leave': 2 };
      const aOrder = availOrder[a.availability] ?? 3;
      const bOrder = availOrder[b.availability] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder; // Available first, then Busy, then On Leave

      return a.name.localeCompare(b.name); // Alphabetical tiebreak
    });
  };

  // ─── Filter + Sort ────────────────────────────────────────
  const filtered = sortEmployees(
    employees.filter(e =>
      !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Stats
  const activeCount = Object.keys(activeTickets).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="h2">Employee Directory</h1>
            {/* Live indicator */}
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[10px] font-semibold text-[#22c55e] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Live
            </span>
          </div>
          <p className="body-text">
            {filtered.length} active employees
            {activeCount > 0 && (
              <span className="ml-2 text-red-400 font-medium">
                • {activeCount} handling tickets
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); }}
          className="btn-primary flex items-center gap-2"
          id="add-employee-btn"
        >
          <UserPlus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Busy</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse" /> Active Ticket</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text" placeholder="Search by name or email..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="input-field text-sm py-2.5 pl-10"
          />
        </div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="input-field text-sm py-2.5 w-48">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-8 w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field text-sm py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field text-sm py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Department</label>
                  <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="input-field text-sm py-2">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Role *</label>
                  <input required value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field text-sm py-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Skill Tags (comma-separated)</label>
                <input value={form.skill_tags} onChange={e => setForm({...form, skill_tags: e.target.value})} className="input-field text-sm py-2" placeholder="bug,db,server" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Avg Resolution (hrs)</label>
                  <input type="number" step="0.5" min="0" value={form.avg_resolution_time} onChange={e => setForm({...form, avg_resolution_time: parseFloat(e.target.value)})} className="input-field text-sm py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Current Load</label>
                  <input type="number" min="0" value={form.current_ticket_load} onChange={e => setForm({...form, current_ticket_load: parseInt(e.target.value)})} className="input-field text-sm py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Availability</label>
                  <select value={form.availability} onChange={e => setForm({...form, availability: e.target.value})} className="input-field text-sm py-2">
                    {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> {editingId ? 'Update' : 'Add Employee'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card text-center py-16">
          <Users className="w-12 h-12 text-[#A1A1A1] mx-auto mb-4 opacity-50" />
          <h3 className="h3 text-white mb-2">No employees available</h3>
          <p className="body-text">You don't have any employees matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp, i) => {
            const ticket = activeTickets[emp.id];
            const hasActive = !!ticket;

            return (
              <div
                key={emp.id}
                className={`glass-card-hover p-5 animate-slide-up transition-all duration-300 ${
                  hasActive
                    ? 'border-l-2 border-l-red-500/50 bg-red-500/[.02]'
                    : ''
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Employee Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-black ${
                      hasActive
                        ? 'bg-red-500'
                        : 'bg-white'
                    }`}>
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold ${hasActive ? 'text-red-400' : 'text-white'}`}>
                          {emp.name}
                        </h3>
                        {hasActive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/25 text-[10px] font-bold text-red-400 uppercase tracking-wide animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Active Ticket
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(emp)} ${hasActive ? 'animate-pulse' : ''}`} />
                    <span className={`text-xs ${getAvailabilityTextColor(emp)}`}>{getAvailabilityLabel(emp)}</span>
                  </div>
                </div>

                {/* Active Ticket Info */}
                {hasActive && (
                  <div className="mb-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Active Assignment</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ticket ID</span>
                        <span className="text-white font-mono font-medium">#{ticket.ticket_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Category</span>
                        <span className="text-white font-medium">{ticket.ticket_category || '—'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewTicket(ticket.ticket_id)}
                      className="mt-2.5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-xs font-semibold transition-all duration-200 border border-red-500/20 hover:border-red-500/40"
                      id={`view-ticket-btn-${emp.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Ticket #{ticket.ticket_id}
                    </button>
                  </div>
                )}

                {/* Employee Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="text-white font-medium">{emp.department}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-300 truncate ml-2">{emp.email}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ticket Load</span>
                    <span className={`font-medium ${emp.current_ticket_load > 3 ? 'text-amber-400' : emp.current_ticket_load > 0 ? 'text-white' : 'text-gray-500'}`}>
                      {emp.current_ticket_load}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Avg Resolution</span><span className="text-white font-medium">{emp.avg_resolution_time}h</span></div>
                  {emp.skill_tags && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {emp.skill_tags.split(',').map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-400 text-[10px] font-medium border border-primary-500/20">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                  <button onClick={() => handleEdit(emp)} className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1">
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => handleDeactivate(emp.id, emp.name)} className="flex-1 btn-danger text-xs py-1.5 flex items-center justify-center gap-1">
                    <UserX className="w-3 h-3" /> Deactivate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
