'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { register, saveAccessToken } from '@/lib/auth-client';

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

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);

    try {
      const authData = await register({
        name: username,
        email,
        password,
      });

      saveAccessToken(authData.accessToken);
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Register failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert('Chức năng Google OAuth cần được tích hợp Google Client ID và thiết lập OAuth trên Google Cloud Console.');
  };

  return (
    <div className="auth-shell auth-dark flex items-center justify-center px-4 py-16">
      <div className="auth-card w-full max-w-2xl p-8 sm:p-10">
        <div className="mb-6">
          <p className="auth-kicker">Tạo tài khoản</p>
          <h1 className="auth-title mt-2 text-3xl font-bold">Đăng ký</h1>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="auth-label" htmlFor="username">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="auth-label" htmlFor="password">
                Tạo mật khẩu
              </label>
              <input
                id="password"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
            <div>
              <label className="auth-label" htmlFor="confirmPassword">
                Nhập lại mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                placeholder="Nhập lại mật khẩu"
                required
              />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="auth-btn disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>Hoặc</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="auth-outline-btn auth-social-btn"
        >
          <GoogleIcon />
          Tiếp tục với Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link className="auth-link" href="/login">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}