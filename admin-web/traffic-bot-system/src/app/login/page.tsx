'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { login, loginWithGoogle, saveAccessToken } from '@/lib/auth-client';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsApi = {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (
      element: HTMLElement,
      options: {
        theme: 'outline' | 'filled_blue' | 'filled_black';
        size: 'large' | 'medium' | 'small';
        text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape: 'rectangular' | 'pill' | 'circle' | 'square';
        width?: number;
      },
    ) => void;
    prompt: () => void;
  };
};

const GoogleIcon = () => (
  <svg className="auth-social-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccountsApi;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleButtonWidth = 320;
  const googleClientId = useMemo(
    () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    [],
  );

  const [isGoogleScriptReady, setIsGoogleScriptReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isGoogleScriptReady || !googleClientId || !window.google || !googleButtonRef.current) {
      return;
    }

    const handleGoogleCredential = async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setError('Google sign-in failed: missing credential');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const authData = await loginWithGoogle(response.credential);
        saveAccessToken(authData.accessToken);
        router.push('/');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign-in failed';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    googleButtonRef.current.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: googleButtonWidth,
    });
  }, [googleClientId, googleButtonWidth, isGoogleScriptReady, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const authData = await login({ email, password });
      saveAccessToken(authData.accessToken);
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell auth-dark flex items-center justify-center px-4 py-16">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsGoogleScriptReady(true)}
      />

      <div className="auth-card w-full max-w-md p-8 sm:p-10">
        <div className="mb-6">
          <p className="auth-kicker">Chào mừng trở lại</p>
          <h1 className="auth-title mt-2 text-3xl font-bold">Đăng nhập</h1>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="Nhập địa chỉ email"
              required
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <div className="text-right">
            <Link className="auth-link text-sm" href="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="auth-btn disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>Hoặc</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {googleClientId ? (
          <div className="mx-auto w-full max-w-[320px]">
            <div className="relative">
              <button
                type="button"
                className="auth-outline-btn auth-social-btn"
                aria-hidden="true"
                tabIndex={-1}
              >
                <GoogleIcon />
                <span>Tiếp tục với Google</span>
              </button>
              <div
                ref={googleButtonRef}
                className="absolute inset-0 flex items-center justify-center opacity-0"
              />
            </div>
          </div>
        ) : (
          <p className="auth-error">
            Thiếu NEXT_PUBLIC_GOOGLE_CLIENT_ID trên frontend.
          </p>
        )}

        <p className="mt-8 text-center text-sm text-slate-600">
          Chưa có tài khoản?{' '}
          <Link className="auth-link" href="/register">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}