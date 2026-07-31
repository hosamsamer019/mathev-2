import { Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'جاري التحميل...' }: LoadingStateProps) {
  const { isDark } = useTheme();
  
  return (
    <div className={`flex flex-col items-center justify-center p-12 min-h-[50vh] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
      <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
      <p className="text-lg font-medium">{message}</p>
    </div>
  );
}
