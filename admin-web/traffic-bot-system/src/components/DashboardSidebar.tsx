'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  clearAccessToken,
  DashboardResponse,
  getAccessToken,
  getDashboard,
  me,
} from '@/lib/auth-client';
import {
  CloseOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';

export default function DashboardSidebar() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setHasToken(false);
      setIsLoading(false);
      return;
    }

    setHasToken(true);
    setIsLoading(true);
    setError('');

    const load = async () => {
      try {
        const [profile, dashboard] = await Promise.all([me(token), getDashboard(token)]);
        setData({
          ...dashboard,
          profile,
        });
      } catch (err) {
        clearAccessToken();
        const message = err instanceof Error ? err.message : 'Unauthorized';
        setError(message);
        setHasToken(false);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [router]);

  const createdAtLabel = useMemo(() => {
    if (!data?.profile.createdAt) {
      return 'Unknown';
    }
    return new Date(data.profile.createdAt).toLocaleString();
  }, [data?.profile.createdAt]);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener('toggle-dashboard', handleToggle);
    return () => window.removeEventListener('toggle-dashboard', handleToggle);
  }, []);

  const onLogout = () => {
    clearAccessToken();
    setData(null);
    setHasToken(false);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('auth-change'));
    router.refresh();
  };

  if (!hasToken) {
    return null;
  }

  const ProfileAvatar = ({ url, name }: { url?: string; name?: string }) => {
    if (url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name ?? 'avatar'}
          src={url}
          className="h-12 w-12 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
        <UserOutlined className="text-xl" />
      </div>
    );
  };

  const DesktopSidebar = (
    <div
      className={`sticky top-0 h-screen shrink-0 border-l border-outline-variant/15 bg-surface-container-lowest/50 backdrop-blur-md transition-all duration-300 hidden xl:block z-40 ${
        isOpen ? 'w-80 p-6' : 'w-0 p-0 overflow-hidden border-none'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-12 top-24 flex h-12 w-12 items-center justify-center rounded-l-xl border border-r-0 border-outline-variant/15 bg-surface-container-lowest/90 backdrop-blur-md text-on-surface hover:text-primary transition-colors z-50 shadow-[-4px_0_12px_rgba(0,0,0,0.1)]"
        title="Toggle Dashboard"
      >
        {isOpen ? <MenuFoldOutlined className="text-xl" /> : <MenuUnfoldOutlined className="text-xl" />}
      </button>

      <div className="w-[272px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
            Dang tai dashboard...
          </div>
        ) : error || !data ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {error || 'Khong the tai du lieu dashboard'}
            </p>
          </div>
        ) : (
          <div className="sticky top-24 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-on-surface">Dashboard</h2>
              <button
                type="button"
                onClick={onLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-error/10 hover:text-error"
                title="Dang xuat"
              >
                <LogoutOutlined />
              </button>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4">
              <ProfileAvatar url={data.profile.avatar} name={data.profile.name} />
              <div className="overflow-hidden">
                <p className="truncate font-semibold text-on-surface">{data.profile.name}</p>
                <p className="truncate text-xs text-on-surface-variant">{data.profile.email}</p>
                <div className="mt-2 w-full">
                  <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      style={{ width: `${data.widgets.profileCompletion}%` }}
                      className="h-full bg-primary transition-all"
                    />
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    Profile completion: {data.widgets.profileCompletion}%
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4">
                <p className="text-xs uppercase tracking-widest text-primary/70">Days active</p>
                <p className="mt-2 text-2xl font-bold text-on-surface">{data.widgets.accountAgeDays}</p>
              </div>
              <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4">
                <p className="text-xs uppercase tracking-widest text-primary/70">Provider</p>
                <p className="mt-2 text-2xl font-bold text-on-surface capitalize">{data.widgets.authProvider}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-5">
              <h3 className="mb-3 text-sm font-semibold text-on-surface">Account Info</h3>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li className="flex justify-between">
                  <span>Tuoi</span>
                  <span className="font-mono text-on-surface">{data.profile.age || '-'}</span>
                </li>
                <li className="flex justify-between">
                  <span>Trang thai</span>
                  <span className="font-mono text-emerald-400">
                    {data.profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Ngay tao</span>
                  <span className="font-mono text-xs text-on-surface">{createdAtLabel}</span>
                </li>
              </ul>
            </div>

            <Link
              className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-on-primary-container transition hover:brightness-110"
              href="/analytics"
            >
              Go to Analytics
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  const MobileDrawer = (
    <div className={`fixed inset-0 z-50 xl:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={`absolute left-0 top-0 h-full w-80 transform bg-surface-container-low p-6 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Dashboard</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high"
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-on-surface-variant">
              Dang tai dashboard...
            </div>
          ) : error || !data ? (
            <div className="flex h-32 items-center justify-center text-center text-sm text-error">
              {error || 'Khong the tai du lieu dashboard'}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ProfileAvatar url={data.profile.avatar} name={data.profile.name} />
                <div>
                  <p className="font-semibold">{data.profile.name}</p>
                  <p className="text-xs text-on-surface-variant">{data.profile.email}</p>
                </div>
              </div>

              <div>
                <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    style={{ width: `${data.widgets.profileCompletion}%` }}
                    className="h-full bg-primary"
                  />
                </div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  Profile completion: {data.widgets.profileCompletion}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-outline-variant/10 p-3 text-center">
                  <div className="text-2xl font-bold">{data.widgets.accountAgeDays}</div>
                  <div className="text-xs text-on-surface-variant">Days active</div>
                </div>
                <div className="rounded-lg border border-outline-variant/10 p-3 text-center">
                  <div className="text-2xl font-bold capitalize">{data.widgets.authProvider}</div>
                  <div className="text-xs text-on-surface-variant">Provider</div>
                </div>
              </div>

              <Link
                className="block rounded-lg bg-primary/90 px-4 py-3 text-center font-bold text-on-primary-container"
                href="/analytics"
              >
                Go to Analytics
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileDrawer}
    </>
  );
}