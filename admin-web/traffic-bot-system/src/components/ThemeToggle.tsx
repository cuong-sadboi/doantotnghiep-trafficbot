'use client';

import { useEffect, useState } from 'react';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsMounted(true);
      const hasLightClass = document.documentElement.classList.contains('light');
      setTheme(hasLightClass ? 'light' : 'dark');
    });
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  };

  if (!isMounted) {
    return <div className="w-8 h-8" />; // Placeholder to prevent mismatch
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface transition-all duration-300 hover:bg-surface-container-high hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Theme"
      type="button"
    >
      <div className="transition-transform duration-500 rotate-0 hover:rotate-12 flex items-center justify-center">
        {theme === 'dark' ? (
          <SunOutlined className="text-amber-400 text-base" />
        ) : (
          <MoonOutlined className="text-indigo-500 text-base" />
        )}
      </div>
    </button>
  );
}
