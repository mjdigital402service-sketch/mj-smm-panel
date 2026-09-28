'use client';

import {
  Bell,
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
  ShieldCheck,
  Menu,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { logoutAction } from '@/app/(auth)/actions';
import { BRAND } from '@/lib/brand.config';

export function Topbar({
  userName,
  unreadCount = 0,
}: {
  userName: string;
  unreadCount?: number;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains('dark');

    setDark(isDark);
  }, []);

  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    setDark((d) => !d);
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur-xl md:px-6">

      {/* =========================
          LEFT SIDE
      ========================== */}
      <div className="flex min-w-0 items-center gap-3">

        {/* Mobile menu indicator */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 md:hidden">
          <Menu className="h-5 w-5" />
        </div>

        <div className="hidden min-w-0 md:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            {BRAND.name}
          </p>

          <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
            Professional Digital & SMM Solutions
          </p>
        </div>
      </div>

      {/* =========================
          RIGHT SIDE
      ========================== */}
      <div className="flex items-center gap-2">

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          {dark ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          <Bell className="h-[18px] w-[18px]" />

          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Divider */}
        <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />

        {/* User profile */}
        <div className="hidden items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">

          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <UserIcon className="h-4 w-4" />
          </div>

          {/* User info */}
          <div className="min-w-0">
            <p className="max-w-[140px] truncate text-xs font-bold text-slate-800">
              {userName}
            </p>

            <div className="mt-0.5 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />

              <span className="text-[9px] font-semibold text-slate-400">
                Verified Account
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <form action={logoutAction}>
          <Button
            variant="outline"
            size="icon"
            type="submit"
            aria-label="Log out"
            className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[17px] w-[17px]" />
          </Button>
        </form>
      </div>
    </header>
  );
}