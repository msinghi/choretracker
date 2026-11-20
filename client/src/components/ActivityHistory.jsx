import React, { useEffect, useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { listTransactions } from '../utils/googleSheetsDb';
import { formatDollars, formatHumanDate, getKidTheme } from '../utils/format';

export default function ActivityHistory({
  kids,
  today,
  refreshSignal,
  onDeleteTransaction,
  onJumpToDate
}) {
  const [kidFilter, setKidFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTransactions({ kidId: kidFilter, type: typeFilter, limit: 200 })
      .then((rows) => {
        if (!cancelled) {
          setTransactions(rows || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kidFilter, typeFilter, refreshSignal]);

  const grouped = [];
  let currentGroup = null;
  for (const tx of transactions) {
    if (!currentGroup || currentGroup.date !== tx.tx_date) {
      currentGroup = { date: tx.tx_date, items: [] };
      grouped.push(currentGroup);
    }
    currentGroup.items.push(tx);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Activity Ledger</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kids.length > 1 && (
            <div className="inline-flex rounded-xl bg-slate-100 p-1 flex-wrap">
              <button
                type="button"
                onClick={() => setKidFilter('all')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                  kidFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                All Kids
              </button>
              {kids.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKidFilter(String(k.id))}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                    kidFilter === String(k.id)
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  {k.avatar} {k.name}
                </button>
              ))}
            </div>
          )}

          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'EARN', label: '+ Earned' },
              { id: 'REDEEM', label: '− Redeemed' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                  typeFilter === t.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-400">
          Loading ledger...
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
          No activity logged yet for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div
              key={group.date}
              className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden"
            >
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {formatHumanDate(group.date, today)}
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToDate(group.date)}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Edit this day&apos;s chores →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {group.items.map((tx) => {
                  const theme = getKidTheme(tx.kid_color);
                  const isEarn = tx.type === 'EARN';

                  return (
                    <div
                      key={tx.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{tx.icon_snapshot}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {tx.title_snapshot}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${theme.badge}`}
                            >
                              {tx.kid_avatar} {tx.kid_name}
                            </span>
                          </div>
                          {tx.note && (
                            <div className="text-xs text-slate-500 truncate">{tx.note}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-sm font-extrabold ${
                              isEarn ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {isEarn ? '+' : '-'}
                            {formatDollars(tx.dollars)}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500">
                            {isEarn ? '+' : '-'}
                            {tx.points} pts
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          title="Undo / delete entry"
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
