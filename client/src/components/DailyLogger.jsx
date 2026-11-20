import React, { useState } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Minus,
  Plus,
  Sparkles,
  Trash2
} from 'lucide-react';
import {
  addDays,
  formatDollars,
  formatHumanDate,
  getKidTheme,
  pointsToDollarsString
} from '../utils/format';

export default function DailyLogger({
  isParent,
  today,
  selectedDate,
  onChangeDate,
  kids,
  chores,
  dayTransactions,
  onChoreAction,
  onAddBonus,
  onDeleteTransaction,
  onNavigateCatalog
}) {
  const [mobileKidId, setMobileKidId] = useState(kids[0]?.id || 1);
  const [bonusFormKidId, setBonusFormKidId] = useState(null);
  const [bonusTitle, setBonusTitle] = useState('');
  const [bonusPoints, setBonusPoints] = useState('5');
  const [bonusIcon, setBonusIcon] = useState('⭐');
  const [busyKey, setBusyKey] = useState(null);

  const isToday = selectedDate === today;
  const yesterday = addDays(today, -1);
  const isYesterday = selectedDate === yesterday;

  // Build maps: kidId -> choreId -> { approved: number, pending: number }
  const choreStats = {};
  const customBonusesByKid = {};
  for (const kid of kids) {
    choreStats[kid.id] = {};
    customBonusesByKid[kid.id] = [];
  }

  for (const tx of dayTransactions) {
    if (tx.type === 'EARN') {
      if (tx.chore_id && choreStats[tx.kid_id]) {
        if (!choreStats[tx.kid_id][tx.chore_id]) {
          choreStats[tx.kid_id][tx.chore_id] = { approved: 0, pending: 0 };
        }
        if (tx.status === 'PENDING') {
          choreStats[tx.kid_id][tx.chore_id].pending += 1;
        } else {
          choreStats[tx.kid_id][tx.chore_id].approved += 1;
        }
      } else if (customBonusesByKid[tx.kid_id]) {
        customBonusesByKid[tx.kid_id].push(tx);
      }
    }
  }

  const handleToggle = async (kidId, choreId, action = 'toggle') => {
    const key = `${kidId}-${choreId}-${action}`;
    setBusyKey(key);
    try {
      await onChoreAction(kidId, choreId, selectedDate, action);
    } finally {
      setBusyKey(null);
    }
  };

  const handleBonusSubmit = async (e, kidId) => {
    e.preventDefault();
    if (!bonusTitle.trim() || Number(bonusPoints) <= 0) return;
    await onAddBonus({
      kidId,
      title: bonusTitle.trim(),
      icon: bonusIcon || '⭐',
      points: Math.round(Number(bonusPoints)),
      date: selectedDate
    });
    setBonusTitle('');
    setBonusPoints('5');
    setBonusFormKidId(null);
  };

  const renderKidChecklist = (kid) => {
    const theme = getKidTheme(kid.color);
    const statsForKid = choreStats[kid.id] || {};
    const customList = customBonusesByKid[kid.id] || [];

    return (
      <div
        key={kid.id}
        className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col"
      >
        {/* Kid column header */}
        <div
          className={`px-4 py-3.5 ${theme.softBg} border-b ${theme.softBorder} flex items-center justify-between gap-2`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{kid.avatar}</span>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {isParent ? `${kid.name}'s Chores` : 'My Chores'}
              </h3>
              <p className="text-xs text-slate-600">
                {isParent
                  ? `Tap chores ${kid.name} completed ${isToday ? 'today' : 'on this day'}`
                  : 'Check off chores you finished — Parent will approve them!'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className={`px-3 py-0.5 rounded-full text-xs font-bold ${theme.badge}`}>
              +{kid.selectedDateEarnedPoints} approved pts
            </div>
            {kid.selectedDatePendingPoints > 0 && (
              <div className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                ⏳ +{kid.selectedDatePendingPoints} pts pending
              </div>
            )}
          </div>
        </div>

        {/* Chore checklist */}
        <div className="p-3 space-y-2 flex-1">
          {chores.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No chores in catalog yet.{' '}
              {isParent && (
                <button
                  type="button"
                  onClick={onNavigateCatalog}
                  className="text-indigo-600 font-semibold underline cursor-pointer"
                >
                  Add chores
                </button>
              )}
            </div>
          ) : (
            chores.map((chore) => {
              const st = statsForKid[chore.id] || { approved: 0, pending: 0 };
              const totalCount = st.approved + st.pending;
              const hasApproved = st.approved > 0;
              const hasPending = st.pending > 0;
              const isBusy = busyKey && busyKey.startsWith(`${kid.id}-${chore.id}`);

              //Kid cannot uncheck if already approved and 0 pending
              const kidLockedMainToggle = !isParent && hasApproved && !hasPending;

              let rowStyle =
                'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70';
              if (hasPending) {
                rowStyle = 'bg-amber-50/70 border-amber-400 border-dashed shadow-2xs';
              } else if (hasApproved) {
                rowStyle = `${theme.softBg} ${theme.activeBorder} shadow-2xs`;
              }

              return (
                <div
                  key={chore.id}
                  className={`group flex items-center justify-between gap-2 rounded-xl border p-3 transition select-none ${rowStyle}`}
                >
                  <button
                    type="button"
                    disabled={Boolean(isBusy) || kidLockedMainToggle}
                    onClick={() => handleToggle(kid.id, chore.id, 'toggle')}
                    className={`flex-1 flex items-center gap-3 text-left min-w-0 ${
                      kidLockedMainToggle ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                        hasPending
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : hasApproved
                          ? theme.checkBg
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      {hasPending ? (
                        <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : hasApproved ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : null}
                    </div>
                    <span className="text-xl shrink-0">{chore.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {chore.title}
                        </span>
                        {hasPending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 text-amber-900">
                            {isParent
                              ? `⏳ ${st.pending} Pending · Tap to Approve`
                              : `⏳ Pending Approval${st.pending > 1 ? ` (×${st.pending})` : ''}`}
                          </span>
                        )}
                        {!isParent && hasApproved && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                            ✓ Approved{st.approved > 1 ? ` (×${st.approved})` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {chore.points} pts · {pointsToDollarsString(chore.points)}
                        {totalCount > 1 && (
                          <span className="ml-1.5 font-bold text-slate-800">
                            (×{totalCount} = {chore.points * totalCount} pts)
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Controls on right */}
                  {totalCount > 0 ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {(isParent || hasPending) && (
                        <button
                          type="button"
                          title={isParent ? 'Remove one' : 'Cancel pending submission'}
                          onClick={() => handleToggle(kid.id, chore.id, 'decrement')}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="min-w-[26px] text-center text-xs font-extrabold text-slate-800">
                        ×{totalCount}
                      </span>
                      <button
                        type="button"
                        title="Log another time on this day"
                        onClick={() => handleToggle(kid.id, chore.id, 'increment')}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggle(kid.id, chore.id, 'toggle')}
                      className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 group-hover:bg-slate-200 cursor-pointer"
                    >
                      +{chore.points} pts
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Custom bonuses logged on selectedDate */}
          {customList.length > 0 && (
            <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                One-off Bonuses ({isToday ? 'Today' : selectedDate})
              </div>
              {customList.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between rounded-xl border ${theme.softBorder} ${theme.softBg} px-3 py-2 text-sm`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{tx.icon_snapshot}</span>
                    <span className="font-semibold text-slate-800 truncate">
                      {tx.title_snapshot}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                      +{tx.points} pts
                    </span>
                  </div>
                  {isParent && (
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx.id)}
                      title="Undo bonus"
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Quick one-off bonus (Parent-only) */}
        {isParent && (
          <div className="p-3 bg-slate-50/70 border-t border-slate-100">
            {bonusFormKidId === kid.id ? (
              <form onSubmit={(e) => handleBonusSubmit(e, kid.id)} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bonusIcon}
                    onChange={(e) => setBonusIcon(e.target.value)}
                    className="w-12 text-center rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-base"
                    maxLength={4}
                    aria-label="Emoji"
                  />
                  <input
                    type="text"
                    placeholder="Bonus task (e.g. Helped wash car)"
                    value={bonusTitle}
                    onChange={(e) => setBonusTitle(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={bonusPoints}
                      onChange={(e) => setBonusPoints(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-16 py-1.5 text-sm font-semibold"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                      pts ({pointsToDollarsString(bonusPoints)})
                    </span>
                  </div>
                  <button
                    type="submit"
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer ${theme.btn}`}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setBonusFormKidId(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setBonusFormKidId(kid.id)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white py-2 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                + Add One-Off Bonus Chore for {kid.name}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const activeMobileKid = kids.find((k) => k.id === mobileKidId) || kids[0];

  return (
    <div className="space-y-4">
      {/* Date Navigator Bar */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeDate(addDays(selectedDate, -1))}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
              title="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <label className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 cursor-pointer">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-sm font-bold text-slate-900">
                {formatHumanDate(selectedDate, today)}
              </span>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => {
                  if (e.target.value) onChangeDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Pick date to log chores"
              />
            </label>

            <button
              type="button"
              disabled={isToday}
              onClick={() => onChangeDate(addDays(selectedDate, 1))}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 cursor-pointer"
              title="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isYesterday && (
              <button
                type="button"
                onClick={() => onChangeDate(yesterday)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Yesterday
              </button>
            )}
            {!isToday && (
              <button
                type="button"
                onClick={() => onChangeDate(today)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
              >
                Back to Today
              </button>
            )}
          </div>
        </div>

        {!isToday && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2 text-xs font-medium text-amber-900">
            <History className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Past Date ({formatHumanDate(selectedDate, today)}):</strong>{' '}
              {isParent
                ? 'Checking or unchecking chores here updates balances & the money trend graph automatically.'
                : 'Chores checked here will be sent to your Parent for approval.'}
            </span>
          </div>
        )}
      </div>

      {isParent && kids.length > 1 ? (
        <>
          {/* Mobile Kid Switcher (< lg) */}
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            {kids.map((kid) => {
              const active = kid.id === (activeMobileKid && activeMobileKid.id);
              const theme = getKidTheme(kid.color);
              return (
                <button
                  key={kid.id}
                  type="button"
                  onClick={() => setMobileKidId(kid.id)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                    active
                      ? `bg-white ${theme.activeBorder} ring-2 ${theme.ring} shadow-xs`
                      : 'bg-slate-100/80 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{kid.avatar}</span>
                    <span className="font-bold text-sm text-slate-900">{kid.name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                    +{kid.selectedDateEarnedPoints}p
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lg:hidden">
            {activeMobileKid && renderKidChecklist(activeMobileKid)}
          </div>

          <div className="hidden lg:grid lg:grid-cols-2 gap-5">
            {kids.map((kid) => renderKidChecklist(kid))}
          </div>
        </>
      ) : (
        /* Single Kid View */
        <div>{kids[0] && renderKidChecklist(kids[0])}</div>
      )}
    </div>
  );
}
