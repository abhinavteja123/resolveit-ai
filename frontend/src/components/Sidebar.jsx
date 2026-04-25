import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Search, Shield, History, LogOut, Upload, Bookmark, Menu, X, PlusCircle } from 'lucide-react';
import { cn } from '../lib/utils';

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
    <div className="flex flex-col h-full relative z-10 bg-dark-900/50 backdrop-blur-3xl">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-dark-800/40">
        <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 group">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30 group-hover:bg-primary-500 transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <span className="text-base font-extrabold tracking-tight text-dark-50">
            ResolveIT <span className="text-primary-500">AI</span>
          </span>
        </Link>
      </div>

      {/* New Chat button */}
      <div className="px-4 pt-5 pb-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { window.dispatchEvent(new CustomEvent('new-chat')); setMobileOpen(false); }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-primary-600/10 text-primary-400 border border-primary-500/20 hover:bg-primary-600/20 hover:border-primary-500/40 transition-colors shadow-sm shadow-primary-500/5"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 group z-10",
                active ? "text-dark-50" : "text-dark-500 hover:text-dark-200"
              )}
            >
              {active && (
                <motion.div 
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 bg-dark-800/80 rounded-xl border border-dark-700/50 shadow-inner shadow-white/5"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ zIndex: -1 }}
                />
              )}
              <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors z-10", active ? "text-primary-400" : "group-hover:text-dark-400")} />
              <span className="z-10">{label}</span>
              
              {active && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] z-10" 
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-dark-800/40 bg-dark-950/30">
        {user && (
          <div className="flex items-center gap-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full border border-dark-700 object-cover flex-shrink-0 shadow-md"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-primary-400 text-sm font-bold flex-shrink-0 shadow-inner shadow-primary-500/20">
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-dark-100 leading-tight truncate">
                {user.name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[11px] font-medium text-dark-500 leading-tight truncate mt-0.5">{user.email}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { logout(); setMobileOpen(false); }}
              className="p-2 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] min-h-screen border-r border-dark-800/60 flex-shrink-0 sticky top-0 h-screen relative bg-dark-950 overflow-hidden">
        {/* Subtle background glow for the whole sidebar */}
        <div className="absolute top-0 left-0 w-full h-64 bg-primary-600/5 blur-[100px] pointer-events-none" />
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800/60 flex items-center justify-between px-4 shadow-md">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center group-hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/20">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-extrabold text-dark-50">ResolveIT <span className="text-primary-500">AI</span></span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800/60 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-14 left-0 bottom-0 w-[260px] bg-dark-950 border-r border-dark-800/60 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </motion.aside>
        </div>
      )}
    </>
  );
}
