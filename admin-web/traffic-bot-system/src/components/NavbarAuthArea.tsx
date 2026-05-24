'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth-client';

export default function NavbarAuthArea() {
  const [hasToken, setHasToken] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = getAccessToken();
    if (token) {
      setHasToken(true);
    }
    
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

  if (hasToken) {
    return (
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-dashboard'))}
        className="h-8 w-8 overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container-high transition hover:ring-2 hover:ring-primary/50"
        title="Toggle Dashboard"
      >
        <img
          alt="User profile"
          className="h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBalHK2ZIt9renDt-yTGD_clOyQbaOFk5fhR-lee4vytkfnO4317aLX0NULJkhF_uDuMWFZCbQKlOf3ufbv-I9kyAnBG1lh15Vxda7v4m5NEekd_ToxcweQnHqCIQQELY7fG-bAc86AM12Hb9Tr1aY9LW3KPotzUSsCF5VLuxjajsg3tQ64AdSvw_ZHynOqyDXdwcV-piTDzYPv8tjagQt24AgjflQJJlpQBkI6zrSm_4Cm34J4NEBjO_u57kH1c4VYnaHA3lkJNcs"
        />
      </button>
    );
  }

  return (
    <>
      <Link
        className="rounded-xl border border-[#abc7ff]/40 px-3 py-1.5 text-sm font-semibold text-[#d6e6ff] transition hover:bg-[#abc7ff]/10"
        href="/login"
      >
        Login
      </Link>
      <Link
        className="rounded-xl bg-[#abc7ff] px-3 py-1.5 text-sm font-semibold text-[#0f2747] transition hover:brightness-110"
        href="/register"
      >
        Register
      </Link>
    </>
  );
}
