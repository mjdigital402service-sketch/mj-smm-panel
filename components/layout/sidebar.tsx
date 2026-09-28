'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Building2,
  Store,
  ListTree,
  Layers,
  Server,
  ShoppingCart,
  Wallet,
  CreditCard,
  Receipt,
  Tags,
  KeyRound,
  LifeBuoy,
  Bell,
  BarChart3,
  Settings,
  ScrollText,
  PlusCircle,
  MessageCircle,
  Phone,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand.config';
import type { NavItem } from './nav-config';

const icons = {
  LayoutDashboard,
  Users,
  Building2,
  Store,
  ListTree,
  Layers,
  Server,
  ShoppingCart,
  Wallet,
  CreditCard,
  Receipt,
  Tags,
  KeyRound,
  LifeBuoy,
  Bell,
  BarChart3,
  Settings,
  ScrollText,
  PlusCircle,
} as const;

export function Sidebar({
  items,
  roleLabel,
}: {
  items: NavItem[];
  roleLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const whatsappUrl = `https://wa.me/${BRAND.whatsappNumber}`;

  const content = (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* =========================
          BRAND HEADER
      ========================== */}
      <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-4 pb-5 pt-5 text-white">

        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />

        <div className="relative flex items-center gap-3">

          {/* Logo */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg shadow-blue-950/20 ring-1 ring-white/20">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Brand */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold tracking-wide">
              {BRAND.name}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-cyan-200" />

              <span className="truncate text-[10px] font-medium text-blue-100">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="relative mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15">
              <Sparkles className="h-3.5 w-3.5 text-cyan-100" />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wider text-blue-100">
                Account
              </p>

              <p className="truncate text-[11px] font-bold text-white">
                {roleLabel}
              </p>
            </div>
          </div>

          <div className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
        </div>
      </div>

      {/* =========================
          NAVIGATION
      ========================== */}
      <div className="px-4 pb-1 pt-4">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Main Menu
        </p>
      </div>

      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">

        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname?.startsWith(item.href + '/');

          const Icon =
            icons[item.icon as keyof typeof icons] ?? LayoutDashboard;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700',
              )}
            >

              {/* Active indicator */}
              {active && (
                <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-cyan-300" />
              )}

              {/* Icon */}
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                  active
                    ? 'bg-white/15 text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600',
                )}
              >
                <Icon
                  className={cn(
                    'h-[17px] w-[17px] transition-transform duration-200',
                    !active && 'group-hover:scale-110',
                  )}
                />
              </span>

              {/* Label */}
              <span className="min-w-0 flex-1 truncate">
                {item.label}
              </span>

              {/* Arrow */}
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-all duration-200',
                  active
                    ? 'translate-x-0 text-white/80'
                    : '-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:text-blue-400 group-hover:opacity-100',
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* =========================
          SUPPORT
      ========================== */}
      <div className="border-t border-slate-200 bg-slate-50/80 p-3">

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Support header */}
          <div className="p-3 pb-2.5">
            <div className="flex items-center gap-2.5">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <LifeBuoy className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">
                  Need Help?
                </p>

                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {BRAND.name} Support
                </p>
              </div>

              <div className="ml-auto flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* Contact buttons */}
          <div className="grid grid-cols-2 gap-2 px-3 pb-3">

            {/* Call */}
            <a
              href={`tel:${BRAND.supportPhone}`}
              className="group flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[10px] font-bold text-slate-600 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <Phone className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              Call
            </a>

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-2 text-[10px] font-bold text-white shadow-sm shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
            >
              <MessageCircle className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              WhatsApp
            </a>
          </div>

          {/* Phone */}
          <div className="border-t border-slate-100 px-3 py-2">
            <p className="text-center text-[10px] font-medium text-slate-400">
              {BRAND.supportPhone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* =========================
          DESKTOP SIDEBAR
      ========================== */}
      <aside className="hidden w-[270px] shrink-0 border-r border-slate-200 bg-white md:block">
        {content}
      </aside>

      {/* =========================
          MOBILE MENU BUTTON
      ========================== */}
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* =========================
          MOBILE SIDEBAR
      ========================== */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-[285px] bg-white shadow-2xl">

            {/* Close button */}
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            {content}
          </div>
        </div>
      )}
    </>
  );
}