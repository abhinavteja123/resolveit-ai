import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Shield, History, LogOut, Upload, Bookmark, Menu, X, PlusCircle } from 'lucide-react';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/dashboard', label: 'Query', icon: Search },
    { to: '/history', label: 'History', icon: History },
    { to: '/my-runbooks', label: 'My Runbooks', icon: Upload },
    { to: '/playbook', label: 'Playbook', icon: Bookmark },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-dark-800/40">
        <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-md shadow-primary-600/25 group-hover:bg-primary-500 transition-colors flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-dark-100">
            ResolveIT <span className="text-primary-400">AI</span>
          </span>
        </Link>
      </div>

      {/* New Chat button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent('new-chat')); setMobileOpen(false); }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-primary-600/15 text-primary-400 border border-primary-600/20 hover:bg-primary-600/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive(to)
                ? 'bg-dark-800/70 text-dark-100'
                : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800/40'
            }`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive(to) ? 'text-primary-400' : ''}`} />
            {label}
            {isActive(to) && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
            )}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-dark-800/40">
        {user && (
          <div className="flex items-center gap-2.5">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-dark-700/80 object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-dark-200 leading-tight truncate">
                {user.name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[10px] text-dark-600 leading-tight truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="p-1.5 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-dark-900/50 border-r border-dark-800/60 flex-shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800/60 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[14px] font-bold text-dark-100">ResolveIT <span className="text-primary-400">AI</span></span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-800/50 transition-all"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute top-14 left-0 bottom-0 w-64 bg-dark-900 border-r border-dark-800/60"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
