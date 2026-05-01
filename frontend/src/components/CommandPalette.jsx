import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Terminal, 
  BookOpen, 
  History, 
  Settings, 
  LogOut, 
  Command, 
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actions definition
  const allActions = [
    {
      id: 'ask-ai',
      title: 'Ask ResolveIT AI...',
      subtitle: 'Jump to dashboard to resolve an issue',
      icon: Sparkles,
      group: 'Suggestions',
      perform: () => navigate('/'),
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10'
    },
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      subtitle: 'Main command center',
      icon: Terminal,
      group: 'Navigation',
      perform: () => navigate('/'),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'nav-history',
      title: 'Search History',
      subtitle: 'View past resolutions',
      icon: History,
      group: 'Navigation',
      perform: () => navigate('/history'),
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10'
    },
    {
      id: 'nav-runbooks',
      title: 'My Playbooks',
      subtitle: 'Manage custom playbooks',
      icon: BookOpen,
      group: 'Navigation',
      perform: () => navigate('/runbooks'),
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    {
      id: 'action-logout',
      title: 'Sign Out',
      subtitle: 'End your session securely',
      icon: LogOut,
      group: 'Actions',
      perform: async () => {
        try {
          await logout();
          navigate('/login');
        } catch (error) {
          console.error("Failed to log out", error);
        }
      },
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    }
  ];

  // Filter actions based on search
  const filteredActions = query === '' 
    ? allActions 
    : allActions.filter((action) => 
        action.title.toLowerCase().includes(query.toLowerCase()) || 
        action.subtitle.toLowerCase().includes(query.toLowerCase())
      );

  // Group the filtered actions
  const groups = filteredActions.reduce((acc, action) => {
    if (!acc[action.group]) acc[action.group] = [];
    acc[action.group].push(action);
    return acc;
  }, {});

  // Flatten for keyboard navigation mapping
  const flatActions = Object.values(groups).flat();

  // Keyboard navigation logic
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyNav = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatActions.length) % flatActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatActions[selectedIndex]) {
          setIsOpen(false);
          flatActions[selectedIndex].perform();
        }
      }
    };

    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [isOpen, selectedIndex, flatActions]);

  // Reset state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Update selection if filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-dark-950/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-2xl bg-dark-900/90 backdrop-blur-xl border border-dark-700/50 shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Header */}
              <div className="flex items-center px-4 py-4 border-b border-dark-800/60 relative">
                <Search className="w-5 h-5 text-dark-400 absolute left-5" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What do you need to resolve?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-white placeholder-dark-500 pl-10 pr-4 text-lg font-medium"
                />
                <div className="flex items-center gap-1 absolute right-4">
                  <span className="text-[10px] font-bold text-dark-500 bg-dark-800 px-2 py-1 rounded-md border border-dark-700">ESC</span>
                </div>
              </div>

              {/* Results Area */}
              <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent">
                {flatActions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Command className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                    <p className="text-dark-400 font-medium">No commands found for "{query}"</p>
                    <p className="text-dark-600 text-sm mt-1">Try searching for a page or action</p>
                  </div>
                ) : (
                  Object.entries(groups).map(([group, actions]) => (
                    <div key={group} className="mb-4 last:mb-0">
                      <div className="px-3 py-1.5 text-xs font-black uppercase tracking-widest text-dark-500">
                        {group}
                      </div>
                      <div className="space-y-1 mt-1">
                        {actions.map((action) => {
                          // Find absolute index of this action
                          const index = flatActions.findIndex(a => a.id === action.id);
                          const isSelected = index === selectedIndex;
                          const Icon = action.icon;

                          return (
                            <button
                              key={action.id}
                              onClick={() => {
                                setIsOpen(false);
                                action.perform();
                              }}
                              onMouseEnter={() => setSelectedIndex(index)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left relative overflow-hidden group",
                                isSelected ? "bg-dark-800/80 shadow-md" : "hover:bg-dark-800/40"
                              )}
                            >
                              {isSelected && (
                                <motion.div 
                                  layoutId="command-active"
                                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 shadow-[0_0_10px_rgba(var(--primary-500),0.8)]"
                                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                              )}
                              
                              <div className={cn(
                                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                isSelected ? action.bgColor : "bg-dark-800/50 group-hover:bg-dark-800",
                                isSelected ? action.color : "text-dark-400 group-hover:text-dark-300"
                              )}>
                                <Icon className="w-5 h-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className={cn(
                                  "text-sm font-semibold truncate transition-colors",
                                  isSelected ? "text-white" : "text-dark-200"
                                )}>
                                  {action.title}
                                </div>
                                <div className="text-xs text-dark-400 truncate mt-0.5">
                                  {action.subtitle}
                                </div>
                              </div>

                              {isSelected && (
                                <ArrowRight className="w-4 h-4 text-dark-400 absolute right-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer info */}
              <div className="px-4 py-3 border-t border-dark-800/60 flex items-center justify-between text-xs text-dark-500 bg-dark-950/30">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">↑</span><span className="bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">↓</span> to navigate</span>
                  <span className="flex items-center gap-1"><span className="bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">↵</span> to select</span>
                </div>
                <div>ResolveIT OS v2.0</div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
