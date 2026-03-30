/**
 * Analytics Dashboard — Module 6
 * Displays ticket statistics, department load, category trends, and charts.
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Clock, Zap, AlertTriangle, CheckCircle2,
  ArrowUpCircle, Loader2, BarChart3, Users
} from 'lucide-react';
import { analyticsApi } from '../api.js';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [deptLoad, setDeptLoad] = useState([]);
  const [topCats, setTopCats] = useState([]);
  const [severityDist, setSeverityDist] = useState([]);
  const [trend, setTrend] = useState([]);
  const [empPerf, setEmpPerf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.overview(),
      analyticsApi.departmentLoad(),
      analyticsApi.topCategories(),
      analyticsApi.severityDistribution(),
      analyticsApi.resolutionTrend(),
      analyticsApi.employeePerformance(),
    ]).then(([ov, dl, tc, sd, tr, ep]) => {
      setOverview(ov);
      setDeptLoad(dl);
      setTopCats(tc);
      setSeverityDist(sd);
      setTrend(tr);
      setEmpPerf(ep);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const statCards = overview ? [
    { label: 'Total Tickets', value: overview.total_tickets, icon: BarChart3, color: 'from-primary-500 to-primary-700', shadow: 'shadow-primary-600/20' },
    { label: 'Open', value: overview.open_tickets, icon: Clock, color: 'from-amber-500 to-amber-700', shadow: 'shadow-amber-600/20' },
    { label: 'Resolved', value: overview.resolved_tickets, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-600/20' },
    { label: 'Auto-Resolved', value: overview.auto_resolved_tickets, icon: Zap, color: 'from-cyan-500 to-cyan-700', shadow: 'shadow-cyan-600/20' },
    { label: 'Escalated', value: overview.escalated_tickets, icon: ArrowUpCircle, color: 'from-red-500 to-red-700', shadow: 'shadow-red-600/20' },
    { label: 'AI Success Rate', value: `${overview.auto_resolution_success_rate}%`, icon: TrendingUp, color: 'from-violet-500 to-violet-700', shadow: 'shadow-violet-600/20' },
  ] : [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Analytics Dashboard</h1>
        <p className="text-gray-400 text-sm">Real-time insights into your ticketing system performance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={card.label} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-lg ${card.shadow}`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Department Load Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Department Load</h3>
          {deptLoad.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptLoad} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="department" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ticket_count" name="Tickets" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-10">No data available</p>}
        </div>

        {/* Top Categories */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Top 5 Categories (This Week)</h3>
          {topCats.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={topCats} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={4} label={({ category, count }) => `${category} (${count})`}>
                  {topCats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-10">No data available</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Avg Resolution Time by Department */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Avg Resolution Time (hours)</h3>
          {deptLoad.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptLoad} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="department" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_resolution_time" name="Avg Hours" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-10">No data available</p>}
        </div>

        {/* Severity Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Severity Distribution</h3>
          {severityDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={severityDist} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={4} label={({ severity, count }) => `${severity} (${count})`}>
                  <Cell fill="#ef4444" />
                  <Cell fill="#f97316" />
                  <Cell fill="#eab308" />
                  <Cell fill="#22c55e" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-10">No data available</p>}
        </div>
      </div>

      {/* Resolution Trend */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Ticket Trend (30 Days)</h3>
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="created" name="Created" stroke="#6366f1" fillOpacity={1} fill="url(#colorCreated)" />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fillOpacity={1} fill="url(#colorResolved)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-500 text-sm text-center py-10">No trend data (submit tickets to see trends)</p>}
      </div>

      {/* Employee Performance Table */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Employee Performance
        </h3>
        {empPerf.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-gray-500 font-medium py-3 px-3">Name</th>
                  <th className="text-left text-xs text-gray-500 font-medium py-3 px-3">Department</th>
                  <th className="text-center text-xs text-gray-500 font-medium py-3 px-3">Load</th>
                  <th className="text-center text-xs text-gray-500 font-medium py-3 px-3">Assigned</th>
                  <th className="text-center text-xs text-gray-500 font-medium py-3 px-3">Resolved</th>
                  <th className="text-center text-xs text-gray-500 font-medium py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {empPerf.map((emp, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-medium text-white">{emp.name}</td>
                    <td className="py-3 px-3 text-gray-400">{emp.department}</td>
                    <td className="py-3 px-3 text-center text-white">{emp.current_load}</td>
                    <td className="py-3 px-3 text-center text-white">{emp.total_assigned}</td>
                    <td className="py-3 px-3 text-center text-emerald-400">{emp.total_resolved}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`badge ${emp.availability === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : emp.availability === 'Busy' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} border`}>
                        {emp.availability}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-500 text-sm text-center py-10">No employee data</p>}
      </div>
    </div>
  );
}
