import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, Search, ArrowLeft } from 'lucide-react';
import Logo from './Logo';

const slides = [
  {
    icon: Sparkles,
    title: 'مرحبًا بك في مَهَرَة',
    description: 'منصة تربط أصحاب المهارات بالعملاء.',
    color: 'from-primary-500 to-primary-700',
  },
  {
    icon: Plus,
    title: 'اعرض مهارتك',
    description: 'أضف خدمتك ودع العملاء يكتشفون ما تستطيع تقديمه.',
    color: 'from-accent-400 to-accent-600',
  },
  {
    icon: Search,
    title: 'اعثر على الخدمة التي تحتاجها',
    description: 'ابحث عن مقدم الخدمة المناسب وتواصل معه بسهولة.',
    color: 'from-blue-500 to-blue-700',
  },
];

export default function Onboarding({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const finish = () => {
    localStorage.setItem('mahrah_onboarded', '1');
    if (onComplete) {
      onComplete();
    } else {
      navigate('/');
    }
  };

  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white">
      {/* Skip */}
      <button
        onClick={finish}
        className="absolute top-6 left-6 z-10 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
      >
        تخطي
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        {step === 0 ? (
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-52 w-64 items-center justify-center overflow-hidden rounded-[2.5rem] bg-[#f5f2e9] shadow-2xl shadow-primary-900/10 ring-1 ring-primary-100">
              <img
                src="/مهرة1.png"
                alt="شعار مَهَرَة الأزرق"
                className="h-full w-full object-cover"
              />
            </div>
            
          </div>
        ) : (
          <div className={`relative mb-8 flex h-48 w-48 items-center justify-center rounded-[2.5rem] bg-gradient-to-br ${slide.color} shadow-2xl`}>
            <Icon size={72} className="text-white" strokeWidth={1.5} />
            <div className="absolute -bottom-3 -right-3 h-16 w-16 rounded-2xl bg-white/20 backdrop-blur" />
            <div className="absolute -top-3 -left-3 h-12 w-12 rounded-full bg-white/10" />
          </div>
        )}

        <h2 className="text-2xl font-black text-slate-800 text-center mb-3">{step === 0 ? 'مرحبًا بكم في مَهَرَة' : slide.title}</h2>
        <p className="text-center text-slate-500 text-lg max-w-xs leading-relaxed">{slide.description}</p>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 pb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-primary-600' : 'w-2 bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-8 pb-10 flex items-center gap-3 max-w-md mx-auto w-full">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <ArrowLeft size={22} className="rotate-180" />
          </button>
        )}
        <button
          onClick={() => (isLast ? finish() : setStep(step + 1))}
          className="btn-primary flex-1 !h-14"
        >
          {isLast ? (
            <span className="flex items-center gap-2">
              <Logo size="sm" showText={false} className="!gap-0" />
              ابدأ الآن
            </span>
          ) : (
            'التالي'
          )}
        </button>
      </div>
    </div>
  );
}
