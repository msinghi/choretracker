import React from 'react';
import { Gift, TrendingUp } from 'lucide-react';
import { formatDollars, getKidTheme } from '../utils/format';

export default function KidWalletCards({
  kids,
  selectedDateLabel,
  isToday,
  onOpenRedeem,
  onSelectTrendTab
}) {
  const gridClass =
    kids.length === 1
      ? 'grid-cols-1'
      : kids.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {kids.map((kid) => {
        const theme = getKidTheme(kid.color);
        return (
          <div
            key={kid.id}
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`h-2 w-full bg-gradient-to-r ${theme.gradient}`} />

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${theme.softBg} border ${theme.softBorder} flex items-center justify-center text-2xl shadow-xs`}
                  >
                    {kid.avatar}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{kid.name}</h2>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      10 pts = $1.00
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {formatDollars(kid.balanceDollars)}
                  </div>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-bold ${theme.badge}`}
                  >
                    {kid.balancePoints} pts available
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 px-2 py-2">
                  <div className="text-[11px] font-medium text-slate-500 truncate">
                    {isToday ? 'Today' : selectedDateLabel}
                  </div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">
                    +{kid.selectedDateEarnedPoints} pts
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2">
                  <div className="text-[11px] font-medium text-slate-500">Total Earned</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    {formatDollars(kid.earnedDollarsTotal)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2">
                  <div className="text-[11px] font-medium text-slate-500">Redeemed</div>
                  <div className="text-sm font-bold text-amber-600 mt-0.5">
                    {formatDollars(kid.redeemedDollarsTotal)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenRedeem(kid)}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-xs transition cursor-pointer ${theme.btn}`}
                >
                  <Gift className="w-4 h-4" />
                  Redeem Points
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTrendTab(`kid_${kid.id}`)}
                  title={`View ${kid.name}'s money trend`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span>Trend</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
