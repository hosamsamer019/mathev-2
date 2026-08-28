import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface StickyFormHeaderProps {
  title: string;
  subtitle?: string;
  activeSectionLabel?: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitDisabled?: boolean;
  extraActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function StickyFormHeader({
  title,
  subtitle,
  activeSectionLabel,
  isSubmitting = false,
  submitLabel = 'حفظ التغييرات',
  cancelLabel = 'إلغاء',
  onSubmit,
  onCancel,
  submitDisabled = false,
  extraActions,
  children,
  className = ''
}: StickyFormHeaderProps) {
  const { isDark } = useTheme();

  return (
    <div
      className={`sticky top-0 z-30 py-3 px-4 sm:px-6 rounded-2xl border backdrop-blur-md transition-all duration-200 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-sm ${
        isDark
          ? 'bg-gray-800/95 border-gray-700 shadow-gray-950/40 text-white'
          : 'bg-white/95 border-gray-200 shadow-gray-200/50 text-gray-900'
      } ${className}`}
    >
      {/* Title & Section indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black tracking-tight truncate">{title}</h2>
            {activeSectionLabel && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border hidden sm:inline-flex items-center ${
                isDark ? 'bg-purple-950/60 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {activeSectionLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Children custom actions or Standard action buttons */}
      <div className="flex items-center gap-2 ms-auto">
        {children}
        {extraActions}
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
              isDark
                ? 'border-gray-700 text-gray-300 hover:bg-gray-700/60'
                : 'border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {cancelLabel}
          </button>
        )}

        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled || isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-l from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white shadow-md shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>{submitLabel}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default StickyFormHeader;
