import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Shield, History, LogOut, Menu, X, Upload, Bookmark } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
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

  return (
    <nav className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-md shadow-primary-600/25 group-hover:bg-primary-500 transition-colors">
              <svg viewBox="0 0 20 20" fill="none" className="w-4.5 h-4.5 w-[18px] h-[18px]">
                <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="hidden sm:block text-[15px] font-700 font-bold tracking-tight text-dark-100">
              ResolveIT <span className="text-primary-400">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(to)
                    ? 'text-dark-100 bg-dark-800/60'
                    : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {isActive(to) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* User section */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2.5">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-dark-700/80 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-primary-400 text-xs font-bold">
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-xs font-semibold text-dark-200 leading-tight">
                    {user.name?.split(' ')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-dark-600 leading-tight">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ml-0.5"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-800/50 transition-all"
          >
            {mobileOpen ? <X className="w-4.5 h-4.5 w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-dark-800/60 bg-dark-950/95 backdrop-blur-xl animate-slide-down">
          <div className="px-4 py-3 space-y-0.5">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive(to)
                    ? 'bg-dark-800/70 text-dark-100'
                    : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {user && (
              <>
                <div className="border-t border-dark-800/50 my-2" />
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-6 h-6 rounded-full border border-dark-700" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 text-[10px] font-bold">
                        {(user.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-dark-400">{user.name?.split(' ')[0] || user.email}</span>
                  </div>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
