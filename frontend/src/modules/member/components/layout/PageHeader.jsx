import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { motion } from 'framer-motion';
import { NotificationBell } from './NotificationBell';
import LanguageSwitcher from '../../../../core/i18n/LanguageSwitcher';

export const PageHeader = ({ title, subtitle = null, showBack = true, rightContent = null, autoHide = false, showBell = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollDirection = useScrollDirection();
  const isNotifPage = location.pathname.includes('/notifications');
  
  const isHidden = autoHide && scrollDirection === 'down';

  return (
    <div 
      className={`responsive-fixed-top z-40 transition-all duration-300 ${
        isHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
      style={{ paddingTop: 'var(--spacing-safe-top)' }}
    >
      {/* Premium glass header */}
      <div 
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          borderBottom: '1px solid rgba(124,58,237,0.07)',
          boxShadow: '0 2px 20px rgba(124,58,237,0.05), 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <div className="flex items-center justify-between h-[58px] px-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {showBack && (
              <motion.button 
                onClick={() => navigate(-1)} 
                whileTap={{ scale: 0.9 }}
                className="shrink-0 w-9 h-9 -ml-1 rounded-2xl flex items-center justify-center transition-all duration-200 relative group"
                style={{
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid rgba(124,58,237,0.10)',
                }}
              >
                {/* Hover fill */}
                <div className="absolute inset-0 rounded-2xl bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <ArrowLeft 
                  size={18} 
                  strokeWidth={2.5} 
                  className="text-brand-primary group-hover:text-white transition-colors duration-200 relative z-10" 
                />
              </motion.button>
            )}
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold text-text-primary tracking-tight truncate leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-[11px] font-medium text-text-muted leading-none mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <LanguageSwitcher />
            {showBell && !isNotifPage && <NotificationBell />}
            {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
          </div>
        </div>

        {/* Gradient bottom accent line */}
        <div 
          className="h-[1.5px] w-full"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.12) 30%, rgba(167,139,250,0.15) 60%, transparent 100%)' }}
        />
      </div>
    </div>
  );
};
