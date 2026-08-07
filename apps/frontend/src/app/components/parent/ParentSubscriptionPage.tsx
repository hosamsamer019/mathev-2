import { useState, useEffect } from 'react';
import { CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';


const plans = [
  {
    id: 'basic_1',
    name: 'الباقة الأساسية',
    price: '١٥٠',
    period: 'شهرياً',
    features: [
      'متابعة مستوى طالب واحد',
      'تقارير أسبوعية',
      'إشعارات الامتحانات'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'premium_1',
    name: 'الباقة المتميزة',
    price: '٢٥٠',
    period: 'شهرياً',
    features: [
      'متابعة حتى ٣ طلاب',
      'تقارير مفصلة يومية',
      'تنبيهات انخفاض المستوى',
      'أولوية الدعم الفني'
    ],
    color: 'from-indigo-500 to-purple-500',
    popular: true
  }
];

export default function ParentSubscriptionPage() {
  const { isDark } = useTheme();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    // Stubbed until Payment module is implemented
    setSubscription({ status: 'coming_soon' });
    setLoading(false);
  }, []);

  const handleCheckout = async (planId: string) => {
    alert('عذراً، ميزة الدفع والاشتراكات قيد التطوير حالياً (قريباً).');
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-12 h-12 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>الاشتراكات والباقات</h1>
        <p className={textSecondary}>إدارة اشتراكاتك وباقات متابعة الأبناء</p>
      </div>

      {/* Current Subscription Status */}
      <div className={`${cardBg} border rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${subscription?.status === 'active' ? 'bg-green-100 text-green-600' : subscription?.status === 'coming_soon' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
            {subscription?.status === 'active' ? <Check className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary}`}>حالة الاشتراك</h2>
            <p className={`${subscription?.status === 'active' ? 'text-green-600 font-medium' : subscription?.status === 'coming_soon' ? 'text-blue-600' : 'text-orange-600'} mt-1`}>
              {subscription?.status === 'active' ? 'نشط' : subscription?.status === 'coming_soon' ? 'قريباً (قيد التطوير)' : subscription?.status === 'past_due' ? 'منتهي الصلاحية' : 'غير مشترك'}
            </p>
          </div>
        </div>
        {subscription?.status === 'active' && (
          <div className="text-right">
            <p className={textSecondary}>تاريخ الانتهاء</p>
            <p className={`font-bold ${textPrimary} mt-1`}>{new Date(subscription.expiresAt).toLocaleDateString('ar-EG')}</p>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
        {plans.map((plan, idx) => (
          <div key={idx} className={`relative ${cardBg} border rounded-3xl p-8 ${plan.popular ? 'ring-2 ring-indigo-500' : ''}`}>
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                الباقة الأكثر طلباً
              </div>
            )}
            
            <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>{plan.name}</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className={`text-4xl font-bold ${textPrimary}`}>{plan.price}</span>
              <span className={textSecondary}>ج.م / {plan.period}</span>
            </div>

            <div className="space-y-4 mb-8">
              {plan.features.map((feature, fIdx) => (
                <div key={fIdx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className={textPrimary}>{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleCheckout(plan.id)}
              disabled={checkoutLoading || subscription?.planId === plan.id}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                subscription?.planId === plan.id 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : `bg-gradient-to-r ${plan.color} text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5`
              }`}
            >
              {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : subscription?.planId === plan.id ? 'الخطة الحالية' : 'اشترك الآن'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
