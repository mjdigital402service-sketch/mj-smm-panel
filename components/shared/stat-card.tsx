import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatTone =
  | 'default'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive';

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  tone?: StatTone;
}) {
  const toneClasses: Record<
    StatTone,
    {
      icon: string;
      accent: string;
      value: string;
    }
  > = {
    default: {
      icon: 'bg-blue-50 text-blue-600 ring-blue-100',
      accent: 'bg-blue-600',
      value: 'text-slate-900',
    },

    primary: {
      icon: 'bg-blue-50 text-blue-600 ring-blue-100',
      accent: 'bg-blue-600',
      value: 'text-slate-900',
    },

    info: {
      icon: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
      accent: 'bg-indigo-600',
      value: 'text-slate-900',
    },

    success: {
      icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      accent: 'bg-emerald-500',
      value: 'text-slate-900',
    },

    warning: {
      icon: 'bg-amber-50 text-amber-600 ring-amber-100',
      accent: 'bg-amber-500',
      value: 'text-slate-900',
    },

    destructive: {
      icon: 'bg-red-50 text-red-600 ring-red-100',
      accent: 'bg-red-500',
      value: 'text-slate-900',
    },
  };

  const colors = toneClasses[tone];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5',
      )}
    >
      {/* Top accent */}
      <div
        className={cn(
          'absolute left-0 right-0 top-0 h-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          colors.accent,
        )}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-xs font-semibold text-slate-500">
                {label}
              </p>

              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
              />
            </div>

            <p
              className={cn(
                'mt-2 truncate text-2xl font-extrabold tracking-tight',
                colors.value,
              )}
            >
              {value}
            </p>

            {trend ? (
              <div className="mt-2 flex items-center gap-1.5">
                <TrendingUp
                  className={cn(
                    'h-3.5 w-3.5',
                    tone === 'warning'
                      ? 'text-amber-500'
                      : tone === 'destructive'
                        ? 'text-red-500'
                        : tone === 'success'
                          ? 'text-emerald-500'
                          : tone === 'info'
                            ? 'text-indigo-500'
                            : 'text-blue-500',
                  )}
                />

                <p className="truncate text-[10px] font-semibold text-slate-400">
                  {trend}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[10px] font-medium text-slate-400">
                Current platform status
              </p>
            )}
          </div>

          {/* Icon */}
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-200',
              colors.icon,
              'group-hover:scale-105',
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}