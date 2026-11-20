import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { getTrendSeries } from '../utils/googleSheetsDb';
import { formatDollars, getKidTheme } from '../utils/format';

function CustomTrendTooltip({ active, payload, visibleFilter, kids }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const [y, m, d] = row.date.split('-').map(Number);
  const niceDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const visibleKids = kids.filter(
    (k) => visibleFilter === 'both' || visibleFilter === `kid_${k.id}`
  );

  return (
    <div className="rounded-2xl bg-slate-900/95 text-white p-3.5 shadow-xl border border-slate-700/80 text-xs min-w-[210px] space-y-2.5">
      <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1.5">
        {niceDate}
      </div>
      {visibleKids.map((kid) => {
        const key = `kid_${kid.id}`;
        const info = row.details?.[key];
        if (!info) return null;
        return (
          <div key={kid.id} className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold flex items-center gap-1.5">
                <span>{kid.avatar}</span>
                <span>{kid.name}</span>
              </span>
              <span className="font-extrabold text-sm text-white">
                {formatDollars(info.closingDollars)}{' '}
                <span className="text-[11px] font-normal text-slate-300">
                  ({info.closingPoints} pts)
                </span>
              </span>
            </div>

            {info.earnedPoints > 0 && (
              <div className="flex items-center gap-1 text-emerald-400 font-semibold pl-5">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>
                  +{formatDollars(info.earnedDollars)} (+{info.earnedPoints} pts earned)
                </span>
              </div>
            )}

            {info.redeemedPoints > 0 && (
              <div className="space-y-0.5 pl-5">
                <div className="flex items-center gap-1 text-amber-400 font-semibold">
                  <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    -{formatDollars(info.redeemedDollars)} (-{info.redeemedPoints} pts redeemed)
                  </span>
                </div>
                {info.items
                  .filter((i) => i.type === 'REDEEM')
                  .map((item, idx) => (
                    <div key={idx} className="text-[11px] text-slate-300 pl-4 truncate max-w-[200px]">
                      {item.icon} {item.title}
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MoneyTrendChart({
  kids,
  initialKidFilter = 'both',
  refreshSignal
}) {
  const [range, setRange] = useState('30');
  const [kidFilter, setKidFilter] = useState(initialKidFilter);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialKidFilter) {
      setKidFilter(initialKidFilter);
    }
  }, [initialKidFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTrendSeries(range)
      .then((data) => {
        if (!cancelled) {
          setTrendData(data.series || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, refreshSignal]);

  const renderDot = (kidKey, strokeHex) => (props) => {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null) return null;
    const detail = payload?.details?.[kidKey];
    const isLast = index === trendData.length - 1;

    if (detail?.redeemedPoints > 0) {
      return (
        <g key={`${kidKey}-redeem-${index}`}>
          <circle cx={cx} cy={cy} r={7} fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={2.5} fill="#b45309" />
        </g>
      );
    }
    if (detail?.earnedPoints > 0 || isLast) {
      return (
        <circle
          key={`${kidKey}-earn-${index}`}
          cx={cx}
          cy={cy}
          r={isLast ? 4.5 : 3.5}
          fill="#ffffff"
          stroke={strokeHex}
          strokeWidth={2.5}
        />
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Money Balance Trend</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Shows cumulative dollar growth from chores and deductions when points are redeemed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kids.length > 1 && (
            <div className="inline-flex rounded-xl bg-slate-100 p-1 flex-wrap">
              <button
                type="button"
                onClick={() => setKidFilter('both')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  kidFilter === 'both'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Kids
              </button>
              {kids.map((k) => {
                const key = `kid_${k.id}`;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKidFilter(key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      kidFilter === key
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {k.avatar} {k.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {[
              { id: '7', label: '7D' },
              { id: '30', label: '30D' },
              { id: '90', label: '90D' },
              { id: 'all', label: 'All' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  range === opt.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
        {kids
          .filter((k) => kidFilter === 'both' || kidFilter === `kid_${k.id}`)
          .map((kid) => {
            const theme = getKidTheme(kid.color);
            return (
              <div key={kid.id} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: theme.hex }}
                />
                <span>
                  {kid.name} ({formatDollars(kid.balanceDollars)})
                </span>
              </div>
            );
          })}
        <div className="flex items-center gap-1.5 text-amber-700">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-100 border-2 border-amber-600 inline-block" />
          <span>Redemption / Cash-out deduction</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-72 sm:h-80 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Loading trend chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <defs>
                {kids.map((kid) => {
                  const theme = getKidTheme(kid.color);
                  const key = `kid_${kid.id}`;
                  return (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.hex} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={theme.hex} stopOpacity={0.01} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                minTickGap={22}
              />
              <YAxis
                tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={54}
              />
              <Tooltip
                content={<CustomTrendTooltip visibleFilter={kidFilter} kids={kids} />}
              />
              {kids.map((kid) => {
                const key = `kid_${kid.id}`;
                if (kidFilter !== 'both' && kidFilter !== key) return null;
                const theme = getKidTheme(kid.color);
                return (
                  <Area
                    key={kid.id}
                    type="linear"
                    dataKey={`${key}Dollars`}
                    name={kid.name}
                    stroke={theme.hex}
                    strokeWidth={3}
                    fill={`url(#grad-${key})`}
                    dot={renderDot(key, theme.hex)}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: theme.hex }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
