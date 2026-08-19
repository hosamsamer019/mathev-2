import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentService } from '../services/assessment.service';
import AssessmentReview from '../components/ui/AssessmentReview';
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AssessmentReviewPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<any>(null);

  useEffect(() => {
    if (id && attemptId) {
      fetchReview();
    }
  }, [id, attemptId]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assessmentService.getAssessmentReview(id!, attemptId!);
      setReviewData(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('لم يتم العثور على المحاولة');
      } else if (err.response?.status === 403) {
        setError('غير مصرح لك بالوصول إلى هذه النتيجة');
      } else {
        setError('حدث خطأ أثناء تحميل النتيجة التفصيلية');
      }
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          العودة
        </button>
        <h1 className="text-2xl font-bold text-gray-900">النتيجة التفصيلية</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="max-w-4xl mx-auto bg-red-50 text-red-700 p-8 rounded-2xl flex flex-col items-center justify-center text-center border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">عذراً</h3>
          <p>{error}</p>
        </div>
      ) : reviewData ? (
        <AssessmentReview data={reviewData} isTeacher={isTeacher} />
      ) : null}
    </div>
  );
}
