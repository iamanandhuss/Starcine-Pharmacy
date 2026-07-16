import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { 
  Pill, Store, Users, Calendar, Layout, Layers, 
  TrendingUp, FileText, CheckCircle2, ChevronRight, ChevronLeft, Sparkles
} from 'lucide-react';

export const OnboardingWizard: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem('pharmacyops_onboarded') !== 'true';
  });

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentSlide < 4) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    localStorage.setItem('pharmacyops_onboarded', 'true');
    setIsOpen(false);
  };

  const slides = [
    {
      title: t('onboarding.welcome_title'),
      desc: t('onboarding.welcome_desc'),
      icon: <Pill className="h-16 w-16 text-brand-500" />,
      color: 'from-brand-500/20 to-purple-500/20',
      element: (
        <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
          <div className="bg-brand-500/10 p-5 rounded-full animate-bounce">
            <Sparkles className="h-10 w-10 text-brand-500" />
          </div>
          <p className="text-xs text-dark-500 dark:text-dark-400 max-w-sm">
            Everything you need to orchestrate daily dispensing compliance, inventories, employee attendance logs, and manager reviews in real time.
          </p>
        </div>
      )
    },
    {
      title: t('onboarding.manage_ops_title'),
      desc: t('onboarding.manage_ops_desc'),
      icon: <Users className="h-16 w-16 text-blue-500" />,
      color: 'from-blue-500/20 to-cyan-500/20',
      element: (
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left pt-2">
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-500" />
            <span className="text-[11px] font-bold">Multi-Store Scope</span>
          </div>
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-[11px] font-bold">Staff Directory</span>
          </div>
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span className="text-[11px] font-bold">Shift Schedules</span>
          </div>
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            <span className="text-[11px] font-bold">Real-time Checkin</span>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.blueprint_title'),
      desc: t('onboarding.blueprint_desc'),
      icon: <Layout className="h-16 w-16 text-emerald-500" />,
      color: 'from-emerald-500/20 to-teal-500/20',
      element: (
        <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
          <div className="bg-emerald-500/10 p-4 rounded-full flex gap-3 text-emerald-500">
            <Layout className="h-6 w-6" />
            <Layers className="h-6 w-6" />
          </div>
          <p className="text-xs text-dark-500 dark:text-dark-400 max-w-sm">
            Drag-and-drop counters, refrigerators, exit doors, and prescription racks directly in the blueprint layout manager, then assign staff to shelves.
          </p>
        </div>
      )
    },
    {
      title: t('onboarding.daily_ops_title'),
      desc: t('onboarding.daily_ops_desc'),
      icon: <TrendingUp className="h-16 w-16 text-orange-500" />,
      color: 'from-orange-500/20 to-red-500/20',
      element: (
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left pt-2">
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span className="text-[11px] font-bold">Counter Sales</span>
          </div>
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <span className="text-[11px] font-bold">Audit Reports</span>
          </div>
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <span className="text-[11px] font-bold">Shelf Grooming</span>
          </div>
          <div className="bg-dark-50 dark:bg-dark-800/50 p-3 rounded-xl border border-dark-100 dark:border-dark-800 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-orange-500" />
            <span className="text-[11px] font-bold">Issue Tracker</span>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.get_started_title'),
      desc: t('onboarding.get_started_desc'),
      icon: <Pill className="h-16 w-16 text-purple-500" />,
      color: 'from-purple-500/20 to-pink-500/20',
      element: (
        <div className="space-y-4 max-w-sm mx-auto pt-2">
          <label className="block text-xs font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider text-center">
            {t('onboarding.choose_lang')}
          </label>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-md'
                  : 'bg-white dark:bg-dark-800 border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200'
              }`}
            >
              🇺🇸 English
            </button>
            <button
              onClick={() => setLanguage('ml')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                language === 'ml'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-md'
                  : 'bg-white dark:bg-dark-800 border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200'
              }`}
            >
              🇮🇳 മലയാളം
            </button>
          </div>
        </div>
      )
    }
  ];

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <Card className="w-full max-w-lg overflow-hidden border-0 shadow-2xl bg-white dark:bg-dark-900 flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Glow Header area */}
        <div className={`h-40 bg-gradient-to-br ${slide.color} flex items-center justify-center transition-all duration-300 relative`}>
          <div className="absolute top-4 right-4">
            <button
              onClick={handleSkip}
              className="text-xs font-bold tracking-wider uppercase text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-white px-3 py-1 rounded bg-black/5 dark:bg-white/5 cursor-pointer"
            >
              {t('common.skip')}
            </button>
          </div>
          <div className="transition-transform duration-300 transform scale-110">
            {slide.icon}
          </div>
        </div>

        {/* Content body */}
        <Card.Content className="flex-1 p-6 space-y-6 flex flex-col text-center">
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight text-dark-900 dark:text-white">
              {slide.title}
            </h2>
            <p className="text-xs text-dark-500 dark:text-dark-400 leading-relaxed max-w-sm mx-auto">
              {slide.desc}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {slide.element}
          </div>

          {/* Progress dots indicator */}
          <div className="flex justify-center gap-1.5 pt-2">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentSlide ? 'w-5 bg-brand-500' : 'w-1.5 bg-dark-200 dark:bg-dark-700'
                }`}
              />
            ))}
          </div>
        </Card.Content>

        {/* Footer actions */}
        <Card.Footer className="border-t border-dark-100 dark:border-dark-800 p-4 flex justify-between bg-dark-50/50 dark:bg-dark-900/50 gap-4">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            className="text-xs font-bold cursor-pointer"
          >
            {t('common.back')}
          </Button>

          <Button
            variant="primary"
            onClick={handleNext}
            rightIcon={currentSlide < 4 ? <ChevronRight className="h-4 w-4" /> : undefined}
            className="text-xs font-bold px-6 shadow-sm cursor-pointer"
          >
            {currentSlide === 4 ? t('common.finish') : t('common.next')}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
};
