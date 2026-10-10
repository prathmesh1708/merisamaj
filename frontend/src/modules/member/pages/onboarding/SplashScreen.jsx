import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Calendar, ChevronRight, ArrowRight } from 'lucide-react';

const slides = [
  {
    icon: Users,
    color: 'text-brand-primary',
    bgColor: 'bg-gradient-to-br from-purple-100 to-violet-50',
    title: 'Your Community, One App',
    description: 'Connect with your samaj members, stay updated with announcements, and participate in community activities.',
  },
  {
    icon: Heart,
    color: 'text-matrimonial-module',
    bgColor: 'bg-gradient-to-br from-pink-100 to-rose-50',
    title: 'Find Your Life Partner',
    description: 'Browse verified matrimonial profiles within your community. Safe, private, and trusted by families.',
  },
  {
    icon: Calendar,
    color: 'text-social-module',
    bgColor: 'bg-gradient-to-br from-blue-100 to-sky-50',
    title: 'Events & Social',
    description: 'Never miss a community event. RSVP, share updates, and connect with fellow members.',
  },
];

const SplashScreen = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('splash'); // 'splash' | 'onboarding'
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (phase === 'splash') {
      const timer = setTimeout(() => setPhase('onboarding'), 2200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (phase === 'splash') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#7C3AED] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-purple-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-violet-300/10 rounded-full blur-2xl" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-fuchsia-400/8 rounded-full blur-2xl animate-float" style={{ animationDelay: '-4s' }} />

        <div className="animate-fade-in flex flex-col items-center z-10">
          <div className="w-22 h-22 bg-white/95 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-900/30 mb-5 backdrop-blur-md border border-white/20">
            <span className="text-brand-primary text-4xl font-bold font-serif">म</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">ApniSamaj</h1>
          <p className="text-white/50 text-sm mt-1.5 font-medium tracking-wide">Your Community, Your Family</p>
        </div>

        <div className="absolute bottom-16">
          <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-5">
        <button onClick={() => navigate('/login')} className="text-xs text-text-secondary font-medium press-scale px-3 py-1.5 rounded-full bg-gray-100/80 hover:bg-purple-50 transition-colors">
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in" key={currentSlide}>
        <div className={`w-28 h-28 rounded-[32px] ${slide.bgColor} flex items-center justify-center mb-8 shadow-lg`}>
          <slide.icon size={48} className={slide.color} />
        </div>
        <h2 className="text-2xl font-bold text-text-primary text-center leading-tight tracking-tight">{slide.title}</h2>
        <p className="text-sm text-text-secondary text-center mt-3 leading-relaxed max-w-[280px]">{slide.description}</p>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-10">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-gradient-to-r from-brand-primary to-brand-glow' : 'w-2 bg-purple-200/60'}`} />
          ))}
        </div>

        <button
          onClick={() => {
            if (isLast) navigate('/login');
            else setCurrentSlide(prev => prev + 1);
          }}
          className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-glow text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 press-scale shadow-lg shadow-purple-500/25"
        >
          {isLast ? 'Get Started' : 'Next'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;
