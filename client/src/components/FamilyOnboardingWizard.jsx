import React, { useState } from 'react';
import { FileSpreadsheet, LogOut, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  createNewFamilySheet,
  initDemoFamily,
  saveAuth
} from '../utils/googleSheetsDb';

const AVATAR_CHOICES = ['🚀', '🌟', '🦄', '🦖', '⚡', '🦋', '🐼', '🏀', '🎨', '⚽'];
const COLOR_CHOICES = [
  { id: 'indigo', label: 'Indigo' },
  { id: 'rose', label: 'Coral' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'violet', label: 'Violet' }
];

export default function FamilyOnboardingWizard({ auth, onComplete, onSignOut }) {
  const isDemo = auth?.mode === 'DEMO';
  const defaultSheetTitle = auth?.user?.name
    ? `${auth.user.name.split(' ')[0]}'s Family Chore Tracker`
    : 'Family Chore Tracker';

  const [sheetTitle, setSheetTitle] = useState(defaultSheetTitle);
  const [kids, setKids] = useState([
    { name: '', avatar: '🚀', color: 'indigo' }
  ]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const updateKid = (idx, patch) => {
    setKids((prev) => prev.map((k, i) => (i === idx ? { ...k, ...patch } : k)));
  };

  const addKidSlot = () => {
    const idx = kids.length;
    setKids((prev) => [
      ...prev,
      {
        name: '',
        avatar: AVATAR_CHOICES[idx % AVATAR_CHOICES.length],
        color: COLOR_CHOICES[idx % COLOR_CHOICES.length].id
      }
    ]);
  };

  const removeKidSlot = (idx) => {
    if (kids.length <= 1) return;
    setKids((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validKids = kids.filter((k) => k.name.trim().length > 0);
    if (validKids.length === 0) {
      setError('Please enter at least one kid name.');
      return;
    }

    setCreating(true);
    try {
      if (isDemo) {
        initDemoFamily(validKids);
        const updatedAuth = { ...auth, onboarded: true };
        saveAuth(updatedAuth);
        onComplete(updatedAuth);
        return;
      }

      const created = await createNewFamilySheet(
        validKids,
        sheetTitle.trim() || 'Family Chore Tracker'
      );
      const updatedAuth = {
        ...auth,
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl
      };
      saveAuth(updatedAuth);
      onComplete(updatedAuth);
    } catch (err) {
      setError(err.message || 'Could not create spreadsheet in Google Drive.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 p-6 text-white flex items-start justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold mb-2">
              {isDemo ? 'Interactive Demo Setup' : `Signed in as ${auth?.user?.email || 'Parent'}`}
            </span>
            <h1 className="text-xl font-extrabold">Set Up Your Kids</h1>
            <p className="text-xs text-white/85 mt-1">
              {isDemo
                ? 'Customize kid profiles below to start exploring the tracker.'
                : 'We will create and format your private Google Sheet automatically with starter chores & rewards.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            className="rounded-xl bg-white/15 hover:bg-white/25 p-2 text-white cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {!isDemo && (
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Google Spreadsheet Name (in your Google Drive)
              </label>
              <div className="relative">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800">
                Kids&apos; Profiles ({kids.length})
              </label>
              <button
                type="button"
                onClick={addKidSlot}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Kid
              </button>
            </div>

            {kids.map((kid, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={kid.avatar}
                    onChange={(e) => updateKid(idx, { avatar: e.target.value })}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-lg cursor-pointer"
                    aria-label="Avatar"
                  >
                    {AVATAR_CHOICES.map((av) => (
                      <option key={av} value={av}>
                        {av}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder={`Enter Kid #${idx + 1}'s Name`}
                    value={kid.name}
                    onChange={(e) => updateKid(idx, { name: e.target.value })}
                    autoFocus={idx === 0}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />

                  <select
                    value={kid.color}
                    onChange={(e) => updateKid(idx, { color: e.target.value })}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 cursor-pointer"
                    aria-label="Color"
                  >
                    {COLOR_CHOICES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {kids.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKidSlot(idx)}
                      className="rounded-xl p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addKidSlot}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white py-2.5 text-xs font-bold text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/40 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Another Kid
            </button>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-sm font-bold shadow-md transition cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {creating
              ? 'Creating & Formatting Your Google Sheet...'
              : isDemo
              ? 'Launch Tracker'
              : 'Create My Google Sheet & Start Tracking'}
          </button>
        </form>
      </div>
    </div>
  );
}
