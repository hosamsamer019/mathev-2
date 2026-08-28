import { useEffect, useRef, useCallback, useState } from 'react';
import { examService } from '../services/exam.service';
import { toast } from 'sonner';

interface UseExamAntiCheatProps {
  assessmentId: string | null;
  attemptId: string | null;
  studentIdentifier: string | null; // e.g. studentId or externalSessionId
  enabled: boolean;
  onDisqualified: () => void;
  initialViolationCount?: number;
}

const VIOLATION_DEBOUNCE_MS = 800;
const BC_CHANNEL = 'exam_anti_cheat_sync';

export function useExamAntiCheat({
  assessmentId,
  attemptId,
  studentIdentifier,
  enabled,
  onDisqualified,
  initialViolationCount = 0
}: UseExamAntiCheatProps) {
  const [violationCount, setViolationCount] = useState(initialViolationCount);
  const [showMultiTabWarning, setShowMultiTabWarning] = useState(false);
  const lastViolationTimestampRef = useRef<number>(0);
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Sync initial count if it changes externally (e.g. data loaded from API)
  useEffect(() => {
    setViolationCount(initialViolationCount);
  }, [initialViolationCount]);

  const reportViolation = useCallback((type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'VISIBILITY_HIDDEN' | 'VISIBILITY_VISIBLE') => {
    if (!enabled || !assessmentId) return;
    if (document.fullscreenElement) return;

    const now = Date.now();

    // VISIBILITY_VISIBLE is informational only — record but never triggers deduplication cooldown
    if (type === 'VISIBILITY_VISIBLE') {
      // Fire and forget
      examService.reportViolation(assessmentId, type).catch(() => {});
      return;
    }

    // Deduplication window: skip if we already reported a counting violation within the window
    if (now - lastViolationTimestampRef.current < VIOLATION_DEBOUNCE_MS) {
      return;
    }
    lastViolationTimestampRef.current = now;

    examService.reportViolation(assessmentId, type)
      .then((res: any) => {
        const nextCount = res.data?.violationCount ?? (violationCount + 1);
        setViolationCount(nextCount);

        if (nextCount >= 3 || res.data?.status === 'CHEATING') {
          onDisqualified();
        } else {
          toast.warning(`تحذير: تم رصد مغادرة شاشة الامتحان! مخالفة (${nextCount} من 3). سيتم إلغاء الامتحان فوراً عند المخالفة الثالثة!`);
        }
      })
      .catch((err: any) => {
        if (err.response?.status === 403 || err.response?.data?.message?.includes('CHEATING') || err.response?.data?.message?.includes('cheating')) {
          onDisqualified();
        }
      });
  }, [assessmentId, enabled, violationCount, onDisqualified]);

  useEffect(() => {
    if (!enabled || !assessmentId || !studentIdentifier) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('VISIBILITY_HIDDEN');
      } else {
        reportViolation('VISIBILITY_VISIBLE');
      }
    };

    const handleBlur = () => {
      reportViolation('WINDOW_BLUR');
    };

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Multi-tab detection via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const channelName = attemptId 
        ? `${BC_CHANNEL}_${assessmentId}_${attemptId}_${studentIdentifier}`
        : `${BC_CHANNEL}_${assessmentId}_${studentIdentifier}`;
        
      const bc = new BroadcastChannel(channelName);
      bcRef.current = bc;

      bc.onmessage = (ev) => {
        if (ev.data?.type === 'TAB_OPENED') {
          // Another tab opened — show warning banner
          setShowMultiTabWarning(true);
          // Acknowledge back so the new tab also knows
          bc.postMessage({ type: 'TAB_ALREADY_OPEN', ts: Date.now() });
        }
        if (ev.data?.type === 'TAB_ALREADY_OPEN') {
          setShowMultiTabWarning(true);
        }
      };

      // Announce this tab
      bc.postMessage({ type: 'TAB_OPENED', ts: Date.now() });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
    };
  }, [enabled, assessmentId, attemptId, studentIdentifier, reportViolation]);

  return {
    violationCount,
    setViolationCount,
    showMultiTabWarning,
    setShowMultiTabWarning
  };
}
