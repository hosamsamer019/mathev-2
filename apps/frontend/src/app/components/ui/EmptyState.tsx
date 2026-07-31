import { FileQuestion } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
}

export function EmptyState({ message = 'لا توجد بيانات حالياً', subMessage }: EmptyStateProps) {
  const { isDark } = useTheme();
  
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <FileQuestion className="w-8 h-8 opacity-50" />
      </div>
      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">{message}</p>
      {subMessage && <p className="text-sm">{subMessage}</p>}
    </div>
  );
}
