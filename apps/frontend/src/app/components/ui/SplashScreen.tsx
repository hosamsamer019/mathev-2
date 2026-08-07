import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash screen for 2.5 seconds on initial load
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-6">
              {/* Soft glow */}
              <div className="absolute inset-0 bg-[#b62626]/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <img 
                src="/logo.jpeg" 
                alt="AL-SADEN Logo" 
                className="w-32 h-32 object-contain relative z-10 rounded-2xl shadow-xl bg-white"
              />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-wide">
              AL-SADEN
            </h1>

            {/* Elegant progress indicator */}
            <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'easeInOut' }}
                className="h-full bg-[#b62626] rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
