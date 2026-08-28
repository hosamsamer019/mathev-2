import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ScrollToTopButtonProps {
  /** Optional container element ID. If not provided, listens to #main-content or window. */
  containerId?: string;
  /** Scroll distance threshold in px to show button (default 300). */
  threshold?: number;
  /** Custom CSS classes for positioning or styling. */
  className?: string;
}

export function ScrollToTopButton({
  containerId = 'main-content',
  threshold = 300,
  className = ''
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const { isDark } = useTheme();

  const getScrollContainer = useCallback(() => {
    if (containerId) {
      const el = document.getElementById(containerId);
      if (el) return el;
    }
    return window;
  }, [containerId]);

  useEffect(() => {
    const handleScroll = () => {
      let currentScroll = 0;
      if (containerId) {
        const el = document.getElementById(containerId);
        if (el) {
          currentScroll = el.scrollTop;
        } else {
          currentScroll = window.scrollY || document.documentElement.scrollTop;
        }
      } else {
        currentScroll = window.scrollY || document.documentElement.scrollTop;
      }

      setVisible(currentScroll > threshold);
    };

    const container = getScrollContainer();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [containerId, threshold, getScrollContainer]);

  const scrollToTop = () => {
    let scrolled = false;
    if (containerId) {
      const el = document.getElementById(containerId);
      if (el && el.scrollTop > 0) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        scrolled = true;
      }
    }

    if (!scrolled) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="العودة للأعلى"
      title="العودة لأعلى الصفحة"
      className={`fixed bottom-6 start-6 z-40 p-3 rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2 group backdrop-blur-md ${
        isDark
          ? 'bg-gray-800/90 hover:bg-gray-700 text-purple-400 border border-gray-700 shadow-purple-950/40'
          : 'bg-white/95 hover:bg-purple-50 text-purple-700 border border-purple-100 shadow-purple-500/15'
      } ${className}`}
    >
      <ArrowUp className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
      <span className="text-xs font-bold hidden sm:inline-block pe-1">للأعلى</span>
    </button>
  );
}

export default ScrollToTopButton;
