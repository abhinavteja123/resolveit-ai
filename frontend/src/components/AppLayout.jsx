import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';

export default function AppLayout({ children }) {
  const location = useLocation();
  
  // Magic Spotlight state
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 500, damping: 50 });
  const smoothY = useSpring(mouseY, { stiffness: 500, damping: 50 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="h-screen bg-dark-950 flex overflow-hidden relative">
      {/* Global Ambient Mesh */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />

      {/* Magic Spotlight */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: useTransform(
            [smoothX, smoothY],
            ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(var(--primary-500), 0.05), transparent 40%)`
          )
        }}
      />
      <motion.div
        className="pointer-events-none fixed inset-0 z-[100] mix-blend-screen opacity-30"
        style={{
          background: useTransform(
            [smoothX, smoothY],
            ([x, y]) => `radial-gradient(200px circle at ${x}px ${y}px, rgba(125, 211, 252, 0.15), transparent 40%)`
          )
        }}
      />

      {/* Universal Command Palette */}
      <CommandPalette />

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
