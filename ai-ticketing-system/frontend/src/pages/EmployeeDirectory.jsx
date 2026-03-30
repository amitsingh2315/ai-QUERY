/**
 * EmployeeDirectory Page — Module 4: Employee management admin page
 */

import React, { useState, useEffect } from 'react';
import {
  UserPlus, Edit3, UserX, Loader2, X, Check, Search, Users
} from 'lucide-react';
import { employeeApi } from '../api.js';

const DEPARTMENTS = ['Engineering', 'DevOps', 'IT', 'HR', 'Finance', 'Product', 'Legal', 'Marketing'];
const AVAILABILITY = ['Available', 'Busy', 'On Leave'];

const emptyForm = {
  name: '', email: '', department: 'Engineering', role: '',
  skill_tags: '', avg_resolution_time: 0, current_ticket_load: 0, availability: 'Available'
};

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeApi.list({ department: filterDept, active_only: true });
      setEmployees(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, [filterDept]);

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

  const getAvailabilityColor = (a) => {
    const m = { 'Available': 'bg-emerald-500', 'Busy': 'bg-amber-500', 'On Leave': 'bg-red-500' };
    return m[a] || 'bg-gray-500';
  };

  const filtered = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-1">Employee Directory</h1>
          <p className="text-gray-400 text-sm">{filtered.length} active employees</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); }}
          className="btn-primary flex items-center gap-2"
          id="add-employee-btn"
        >
          <UserPlus className="w-4 h-4" /> Add Employee
        </button>
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
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp, i) => (
            <div key={emp.id} className="glass-card-hover p-5 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm font-bold text-white">
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{emp.name}</h3>
                    <p className="text-xs text-gray-400">{emp.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(emp.availability)}`} />
                  <span className="text-xs text-gray-400">{emp.availability}</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="text-white font-medium">{emp.department}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-300 truncate ml-2">{emp.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ticket Load</span><span className="text-white font-medium">{emp.current_ticket_load}</span></div>
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
              <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                <button onClick={() => handleEdit(emp)} className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1">
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => handleDeactivate(emp.id, emp.name)} className="flex-1 btn-danger text-xs py-1.5 flex items-center justify-center gap-1">
                  <UserX className="w-3 h-3" /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
