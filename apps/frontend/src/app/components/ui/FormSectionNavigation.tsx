import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export interface FormSection {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FormSectionNavigationProps {
  sections: FormSection[];
  activeSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
  containerId?: string;
  headerOffset?: number;
  className?: string;
  variant?: 'pills' | 'tabs' | 'stepper';
}

export function FormSectionNavigation({
  sections,
  activeSectionId: controlledActiveId,
  onSectionChange,
  containerId = 'main-content',
  headerOffset = 80,
  className = '',
  variant = 'pills'
}: FormSectionNavigationProps) {
  const [activeId, setActiveId] = useState<string>(controlledActiveId || sections[0]?.id || '');
  const { isDark } = useTheme();

  useEffect(() => {
    if (controlledActiveId) {
      setActiveId(controlledActiveId);
    }
  }, [controlledActiveId]);

  // Automatic scroll spy if not explicitly controlled
  useEffect(() => {
    if (controlledActiveId) return;

    const getScrollContainer = () => {
      if (containerId) {
        const el = document.getElementById(containerId);
        if (el) return el;
      }
      return window;
    };

    const container = getScrollContainer();

    const handleScrollSpy = () => {
      const scrollPos = (containerId && document.getElementById(containerId))
        ? (document.getElementById(containerId)?.scrollTop || 0) + headerOffset + 20
        : (window.scrollY || document.documentElement.scrollTop) + headerOffset + 20;

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        const el = document.getElementById(sec.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveId(sec.id);
            break;
          }
        }
      }
    };

    container.addEventListener('scroll', handleScrollSpy, { passive: true });
    window.addEventListener('scroll', handleScrollSpy, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScrollSpy);
      window.removeEventListener('scroll', handleScrollSpy);
    };
  }, [sections, containerId, headerOffset, controlledActiveId]);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    const container = containerId ? document.getElementById(containerId) : null;

    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = el.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - headerOffset;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    } else {
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    }

    setActiveId(sectionId);
    if (onSectionChange) onSectionChange(sectionId);
  }, [containerId, headerOffset, onSectionChange]);

  if (!sections || sections.length <= 1) return null;

  return (
    <nav
      aria-label="أقسام النموذج"
      className={`sticky top-0 z-20 py-2 px-3 backdrop-blur-md rounded-2xl border transition-all duration-200 ${
        isDark
          ? 'bg-gray-800/90 border-gray-700/80 shadow-lg shadow-black/20'
          : 'bg-white/90 border-gray-200/80 shadow-sm'
      } ${className}`}
    >
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {sections.map((section, idx) => {
          const isActive = activeId === section.id;
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                isActive
                  ? (isDark
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50 scale-[1.02]'
                      : 'bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]')
                  : (isDark
                      ? 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
              }`}
            >
              {Icon ? (
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              ) : (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {idx + 1}
                </span>
              )}
              <span>{section.label}</span>
              {section.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/30 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {section.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default FormSectionNavigation;
