import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Gift, Sparkles, X } from 'lucide-react';
import {
  POINTS_PER_DOLLAR,
  formatDollars,
  getKidTheme,
  pointsToDollarsString
} from '../utils/format';

export default function RedeemModal({
  isOpen,
  onClose,
  kids,
  initialKid,
  rewards,
  today,
  defaultDate,
  onRedeem,
  onManageRewards
}) {
  const [selectedKidId, setSelectedKidId] = useState(initialKid?.id || kids[0]?.id || 1);
  const [mode, setMode] = useState('rewards'); // 'rewards' | 'custom'
  const [txDate, setTxDate] = useState(defaultDate || today);
  const [customPoints, setCustomPoints] = useState('');
  const [customDollars, setCustomDollars] = useState('');
  const [customTitle, setCustomTitle] = useState('Cash Out');
  const [customIcon, setCustomIcon] = useState('💵');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialKid?.id) setSelectedKidId(initialKid.id);
      setTxDate(defaultDate || today);
      setError('');
      setCustomPoints('');
      setCustomDollars('');
    }
  }, [isOpen, initialKid, defaultDate, today]);

  if (!isOpen) return null;

  const kid = kids.find((k) => k.id === selectedKidId) || kids[0];
  const theme = getKidTheme(kid.color);

  const handlePointsChange = (val) => {
    setError('');
    setCustomPoints(val);
    const num = Number(val);
    if (val === '' || !Number.isFinite(num)) {
      setCustomDollars('');
    } else {
      setCustomDollars((Math.round(num) / POINTS_PER_DOLLAR).toFixed(2));
    }
  };

  const handleDollarsChange = (val) => {
    setError('');
    setCustomDollars(val);
    const num = Number(val);
    if (val === '' || !Number.isFinite(num)) {
      setCustomPoints('');
    } else {
      setCustomPoints(String(Math.round(num * POINTS_PER_DOLLAR)));
    }
  };

  const handleFillMax = () => {
    if (kid.balancePoints <= 0) return;
    handlePointsChange(String(kid.balancePoints));
  };

  const handleRedeemReward = async (reward) => {
    setError('');
    setSubmitting(true);
    try {
      await onRedeem({
        kidId: kid.id,
        rewardId: reward.id,
        title: reward.title,
        icon: reward.icon,
        points: reward.pointsCost,
        date: txDate
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not redeem reward.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const pts = Math.round(Number(customPoints));
    if (!Number.isFinite(pts) || pts <= 0) {
      setError('Enter at least 1 point ($0.10) to redeem.');
      return;
    }
    if (pts > kid.balancePoints) {
      setError(
        `${kid.name} only has ${kid.balancePoints} pts (${formatDollars(kid.balanceDollars)}) available.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onRedeem({
        kidId: kid.id,
        title: customTitle.trim() || 'Cash Out',
        icon: customIcon || '💵',
        points: pts,
        date: txDate
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not redeem points.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-r ${theme.gradient} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <Gift className="w-5 h-5" />
            <h2 className="text-lg font-bold">Redeem Points</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Kid Switcher */}
          <div className="grid grid-cols-2 gap-2">
            {kids.map((k) => {
              const kTheme = getKidTheme(k.color);
              const selected = k.id === kid.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => {
                    setSelectedKidId(k.id);
                    setError('');
                  }}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                    selected
                      ? `${kTheme.softBg} ${kTheme.activeBorder} ring-2 ${kTheme.ring}`
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{k.avatar}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{k.name}</div>
                      <div className="text-xs text-slate-500">{k.balancePoints} pts</div>
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {formatDollars(k.balanceDollars)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Date Picker for Redemption */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Redemption Date</span>
            </div>
            <input
              type="date"
              value={txDate}
              max={today}
              onChange={(e) => setTxDate(e.target.value || today)}
              className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1"
            />
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('rewards');
                setError('');
              }}
              className={`rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                mode === 'rewards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎁 Rewards Menu
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('custom');
                setError('');
              }}
              className={`rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                mode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              💵 Custom Cash / Points
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {mode === 'rewards' ? (
            <div className="space-y-2.5">
              {rewards.map((reward) => {
                const canAfford = kid.balancePoints >= reward.pointsCost;
                const needed = reward.pointsCost - kid.balancePoints;
                return (
                  <div
                    key={reward.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                      canAfford
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-100 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{reward.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {reward.title}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          {reward.pointsCost} pts · {pointsToDollarsString(reward.pointsCost)}
                        </div>
                      </div>
                    </div>

                    {canAfford ? (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRedeemReward(reward)}
                        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer ${theme.btn}`}
                      >
                        Redeem
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-lg bg-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Need {needed} more pts
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManageRewards();
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Edit or add items to Rewards Menu →
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Amount to Redeem (10 pts = $1.00)
                  </label>
                  {kid.balancePoints > 0 && (
                    <button
                      type="button"
                      onClick={handleFillMax}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Use Full Balance ({formatDollars(kid.balanceDollars)})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.10"
                      min="0.10"
                      placeholder="0.00"
                      value={customDollars}
                      onChange={(e) => handleDollarsChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="block text-[11px] text-slate-500 mt-1">Dollar Value</span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="0"
                      value={customPoints}
                      onChange={(e) => handlePointsChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 pl-3 pr-11 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                      pts
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-1">Points Deducted</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  What is {kid.name} redeeming for?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    maxLength={4}
                    className="w-12 text-center rounded-xl border border-slate-300 px-2 py-2 text-lg"
                  />
                  <input
                    type="text"
                    placeholder="e.g. Cash payout, LEGO set, Pokémon cards"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || kid.balancePoints <= 0}
                className={`w-full rounded-xl py-3 text-sm font-bold shadow-sm transition cursor-pointer disabled:opacity-50 ${theme.btn}`}
              >
                {submitting
                  ? 'Recording Redemption...'
                  : `Redeem ${customPoints ? `${Math.round(Number(customPoints))} pts (${pointsToDollarsString(Math.round(Number(customPoints)))})` : 'Points'}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
