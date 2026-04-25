import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  const location = useLocation();

  return (
    <div className="h-screen bg-dark-950 flex overflow-hidden relative">
      {/* Global Ambient Mesh */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />

      <Sidebar />
      
      <div className="flex-1 overflow-hidden md:pt-0 pt-14 flex flex-col min-h-0 relative bg-dark-950/20 rounded-tl-3xl border-l border-t border-dark-800/30 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            className="flex-1 overflow-auto h-full w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
