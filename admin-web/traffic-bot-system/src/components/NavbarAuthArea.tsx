'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth-client';
import ThemeToggle from './ThemeToggle';
import { useLanguage } from '@/context/LanguageContext';

export default function NavbarAuthArea() {
  const [hasToken, setHasToken] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsMounted(true);
      const token = getAccessToken();
      if (token) {
        setHasToken(true);
      }
    });
    
    // Listen for custom event to update token state
    const handleAuthChange = () => {
      setHasToken(!!getAccessToken());
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  if (!isMounted) {
    return <div className="h-8 w-8" />; // Placeholder to avoid hydration mismatch
  }

  const LanguageSwitcher = (
    <button
      onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
      className="flex h-8 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high px-2.5 text-xs font-mono font-bold tracking-tight text-on-surface hover:border-primary/50 transition cursor-pointer"
      title={language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
    >
      {language === "vi" ? "VI" : "EN"}
    </button>
  );

  if (hasToken) {
    return (
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {LanguageSwitcher}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-dashboard'))}
          className="h-8 w-8 overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container-high transition hover:ring-2 hover:ring-primary/50 cursor-pointer"
          title="Toggle Dashboard"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="User profile"
            className="h-full w-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBalHK2ZIt9renDt-yTGD_clOyQbaOFk5fhR-lee4vytkfnO4317aLX0NULJkhF_uDuMWFZCbQKlOf3ufbv-I9kyAnBG1lh15Vxda7v4m5NEekd_ToxcweQnHqCIQQELY7fG-bAc86AM12Hb9Tr1aY9LW3KPotzUSsCF5VLuxjajsg3tQ64AdSvw_ZHynOqyDXdwcV-piTDzYPv8tjagQt24AgjflQJJlpQBkI6zrSm_4Cm34J4NEBjO_u57kH1c4VYnaHA3lkJNcs"
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      {LanguageSwitcher}
      <Link
        className="rounded-xl border border-primary/40 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
        href="/login"
      >
        {t('navbar.login')}
      </Link>
      <Link
        className="rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary-container transition hover:brightness-110"
        href="/register"
      >
        {t('navbar.register')}
      </Link>
    </div>
  );
}
