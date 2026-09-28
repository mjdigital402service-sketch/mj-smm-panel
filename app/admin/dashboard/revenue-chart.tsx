'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { formatCurrency } from '@/lib/brand.config';

type ChartData = {
  date: string;
  revenue: number;
  profit: number;
};

export function RevenueChart({ data }: { data: ChartData[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 8,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            {/* Revenue gradient */}
            <linearGradient
              id="mjRevenueGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#2563eb"
                stopOpacity={0.28}
              />
              <stop
                offset="100%"
                stopColor="#2563eb"
                stopOpacity={0.01}
              />
            </linearGradient>

            {/* Profit gradient */}
            <linearGradient
              id="mjProfitGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#10b981"
                stopOpacity={0.24}
              />
              <stop
                offset="100%"
                stopColor="#10b981"
                stopOpacity={0.01}
              />
            </linearGradient>
          </defs>

          {/* Grid */}
          <CartesianGrid
            stroke="#e2e8f0"
            strokeDasharray="4 4"
            vertical={false}
          />

          {/* X Axis */}
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
              fontWeight: 500,
            }}
            tickMargin={10}
          />

          {/* Y Axis */}
          <YAxis
            tickLine={false}
            axisLine={false}
            width={55}
            tick={{
              fill: '#94a3b8',
              fontSize: 10,
              fontWeight: 500,
            }}
            tickFormatter={(value) => {
              if (value >= 100000) {
                return `₹${(value / 100000).toFixed(1)}L`;
              }

              if (value >= 1000) {
                return `₹${(value / 1000).toFixed(1)}K`;
              }

              return `₹${value}`;
            }}
          />

          {/* Tooltip */}
          <Tooltip
            cursor={{
              stroke: '#cbd5e1',
              strokeDasharray: '4 4',
            }}
            contentStyle={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow:
                '0 12px 30px rgba(15, 23, 42, 0.10)',
              padding: '12px 14px',
            }}
            labelStyle={{
              color: '#475569',
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 6,
            }}
            itemStyle={{
              fontSize: 11,
              fontWeight: 600,
            }}
            formatter={(value, name) => [
              formatCurrency(Number(value ?? 0)),
              name === 'revenue' ? 'Revenue' : 'Profit',
            ]}
          />

          {/* Revenue */}
          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#2563eb"
            fill="url(#mjRevenueGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              stroke: '#ffffff',
              strokeWidth: 2,
              fill: '#2563eb',
            }}
            animationDuration={700}
          />

          {/* Profit */}
          <Area
            type="monotone"
            dataKey="profit"
            name="profit"
            stroke="#10b981"
            fill="url(#mjProfitGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              stroke: '#ffffff',
              strokeWidth: 2,
              fill: '#10b981',
            }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}