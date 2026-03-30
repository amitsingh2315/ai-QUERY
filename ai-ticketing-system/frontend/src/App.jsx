/**
 * App.jsx — Root component with routing and layout.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Ticket, ListTodo, Users, BarChart3,
  Zap, Menu, X, Activity, History
} from 'lucide-react';
import { useState } from 'react';

// Pages
import TicketSubmit from './pages/TicketSubmit.jsx';
import TicketList from './pages/TicketList.jsx';
import TicketDetail from './pages/TicketDetail.jsx';
import EmployeeDirectory from './pages/EmployeeDirectory.jsx';
import Analytics from './pages/Analytics.jsx';
import MyTickets from './pages/MyTickets.jsx';

// ─── Sidebar Navigation ─────────────────────────────────

const userItems = [
  { path: '/', icon: Ticket, label: 'Submit Ticket' },
  { path: '/my-tickets', icon: History, label: 'My Tickets' },
];

const adminItems = [
  { path: '/tickets', icon: ListTodo, label: 'Ticket Management' },
  { path: '/employees', icon: Users, label: 'Employee Directory' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics Dashboard' },
];

const renderNavItem = ({ path, icon: Icon, label, onClose }) => (
  <NavLink
    key={path}
    to={path}
    end={path === '/'}
    onClick={onClose}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
      transition-all duration-200
      ${isActive
        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-lg shadow-primary-600/10'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
      }
    `}
  >
    <Icon className="w-5 h-5" />
    {label}
  </NavLink>
);

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50
        w-72 bg-surface-800/90 backdrop-blur-2xl border-r border-white/5
        flex flex-col transition-transform duration-300
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-600/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Tickets</h1>
              <p className="text-xs text-gray-400">Smart Support</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
          <div>
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3">
              User Portal
            </p>
            <div className="space-y-1.5">
              {userItems.map(item => renderNavItem({ ...item, onClose }))}
            </div>
          </div>
          <div>
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3">
              Admin Portal
            </p>
            <div className="space-y-1.5">
              {adminItems.map(item => renderNavItem({ ...item, onClose }))}
            </div>
          </div>
        </nav>

        {/* Status footer */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse-soft" />
            <span className="text-xs font-medium text-emerald-400">System Online</span>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Main Layout ─────────────────────────────────────────

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-surface-800/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<TicketSubmit />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/employees" element={<EmployeeDirectory />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Layout>
    </Router>
  );
}
