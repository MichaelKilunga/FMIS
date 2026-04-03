import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'sw', name: 'Swahili', flag: '🇹🇿' }
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = async (code: string) => {
    if (code === i18n.language) return;
    
    setIsChanging(true);
    try {
      await i18n.changeLanguage(code);
      
      if (isAuthenticated && user) {
        const formData = new FormData();
        formData.append('locale', code);
        const response = await authApi.updateProfile(formData);
        setUser(response.data.user);
      }
      
      setIsOpen(false);
      toast.success(t('common.language_changed', { defaultValue: 'Language changed successfully' }));
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error('Failed to update language');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        className={clsx(
          "flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-all duration-200 text-slate-300 hover:text-white",
          isChanging && "opacity-50 cursor-wait"
        )}
        title={t('common.language')}
      >
        <div className="flex items-center gap-2">
          <Languages size={18} className={clsx("text-blue-400", isChanging && "animate-spin-slow")} />
          <span className="text-sm font-medium hidden md:inline">{currentLanguage.flag}</span>
        </div>
        <ChevronDown size={14} className={clsx('transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 glass-card py-2 z-[9999] animate-fade-in shadow-2xl border border-slate-700/50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={clsx(
                "flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors duration-150",
                i18n.language === lang.code 
                  ? "bg-blue-600/20 text-blue-400 font-semibold" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
              {i18n.language === lang.code && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
