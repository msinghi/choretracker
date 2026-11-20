import React, { useState } from 'react';
import { Check, Edit3, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { getKidTheme, pointsToDollarsString } from '../utils/format';

const CHORE_EMOJIS = ['🛏️', '🫧', '🧺', '🧹', '🗑️', '🧸', '🍽️', '🎒', '🚿', '🌿', '🐕', '📚'];
const REWARD_EMOJIS = ['🎮', '🍦', '🎬', '🎁', '💵', '🍕', '🎨', '⚽', '🧁', '🛝', '🎧', '🌟'];
const KID_AVATARS = ['🚀', '🌟', '🦄', '🦖', '⚡', '🦋', '🐼', '🏀'];
const KID_COLORS = [
  { id: 'indigo', label: 'Indigo' },
  { id: 'rose', label: 'Coral / Rose' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'violet', label: 'Violet' }
];

export default function CatalogManager({
  kids = [],
  chores,
  rewards,
  initialSection = 'chores',
  onSaveChore,
  onDeleteChore,
  onSaveReward,
  onDeleteReward,
  onSaveKid
}) {
  const [section, setSection] = useState(initialSection);

  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState(initialSection === 'rewards' ? '🎁' : '🛏️');
  const [newPoints, setNewPoints] = useState(initialSection === 'rewards' ? '25' : '5');

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editPoints, setEditPoints] = useState('');

  // Kid add / edit state
  const [editingKidId, setEditingKidId] = useState(null);
  const [kidName, setKidName] = useState('');
  const [kidAvatar, setKidAvatar] = useState('🚀');
  const [kidColor, setKidColor] = useState('indigo');

  const switchSection = (sec) => {
    setSection(sec);
    setEditingId(null);
    setEditingKidId(null);
    setNewTitle('');
    setNewIcon(sec === 'rewards' ? '🎁' : '🛏️');
    setNewPoints(sec === 'rewards' ? '25' : '5');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || Number(newPoints) <= 0) return;
    if (section === 'chores') {
      await onSaveChore({
        title: newTitle.trim(),
        icon: newIcon || '✨',
        points: Math.round(Number(newPoints))
      });
    } else {
      await onSaveReward({
        title: newTitle.trim(),
        icon: newIcon || '🎁',
        pointsCost: Math.round(Number(newPoints))
      });
    }
    setNewTitle('');
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditIcon(item.icon);
    setEditPoints(String(section === 'chores' ? item.points : item.pointsCost));
  };

  const handleUpdate = async (id) => {
    if (!editTitle.trim() || Number(editPoints) <= 0) return;
    if (section === 'chores') {
      await onSaveChore({
        id,
        title: editTitle.trim(),
        icon: editIcon || '✨',
        points: Math.round(Number(editPoints))
      });
    } else {
      await onSaveReward({
        id,
        title: editTitle.trim(),
        icon: editIcon || '🎁',
        pointsCost: Math.round(Number(editPoints))
      });
    }
    setEditingId(null);
  };

  const startEditKid = (k) => {
    setEditingKidId(k.id);
    setKidName(k.name);
    setKidAvatar(k.avatar || '🚀');
    setKidColor(k.color || 'indigo');
  };

  const handleSaveKidForm = async (e) => {
    e.preventDefault();
    if (!kidName.trim() || !onSaveKid) return;
    await onSaveKid({
      id: editingKidId || undefined,
      name: kidName.trim(),
      avatar: kidAvatar || '🚀',
      color: kidColor
    });
    setEditingKidId(null);
    setKidName('');
  };

  const items = section === 'chores' ? chores : rewards;
  const emojiList = section === 'chores' ? CHORE_EMOJIS : REWARD_EMOJIS;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-slate-200/70 p-1 flex-wrap">
          <button
            type="button"
            onClick={() => switchSection('chores')}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
              section === 'chores'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🧹 Master Chores ({chores.length})
          </button>
          <button
            type="button"
            onClick={() => switchSection('rewards')}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
              section === 'rewards'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎁 Rewards Menu ({rewards.length})
          </button>
          <button
            type="button"
            onClick={() => switchSection('kids')}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
              section === 'kids'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👧👦 Kids ({kids.length})
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Changes sync automatically to your Google Sheet.
        </p>
      </div>

      {section === 'kids' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kids.map((k) => {
              const theme = getKidTheme(k.color);
              return (
                <div
                  key={k.id}
                  className={`rounded-2xl bg-white border ${theme.softBorder} p-4 flex items-center justify-between gap-3 shadow-2xs`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-11 h-11 rounded-xl ${theme.softBg} flex items-center justify-center text-2xl`}
                    >
                      {k.avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900">{k.name}</div>
                      <div className="text-xs text-slate-500">
                        Balance: {pointsToDollarsString(k.balancePoints)} ({k.balancePoints} pts)
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditKid(k)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSaveKidForm}
            className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>
                  {editingKidId ? `Edit ${kidName || 'Kid'}'s Profile` : 'Add Another Kid'}
                </span>
              </div>
              {editingKidId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingKidId(null);
                    setKidName('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {KID_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setKidAvatar(av)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer ${
                    kidAvatar === av ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-slate-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kid Name</label>
                <input
                  type="text"
                  placeholder="Enter kid's name"
                  value={kidName}
                  onChange={(e) => setKidName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Theme</label>
                <select
                  value={kidColor}
                  onChange={(e) => setKidColor(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {KID_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold cursor-pointer"
            >
              {editingKidId ? 'Save Profile Changes' : 'Add Kid'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <form
            onSubmit={handleAdd}
            className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs space-y-3"
          >
            <div className="text-sm font-bold text-slate-900">
              {section === 'chores' ? 'Add New Chore to Catalog' : 'Add New Reward to Menu'}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {emojiList.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setNewIcon(em)}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition cursor-pointer ${
                    newIcon === em
                      ? 'bg-indigo-100 ring-2 ring-indigo-500'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                maxLength={4}
                className="w-14 text-center rounded-xl border border-slate-300 px-2 py-2 text-lg"
                aria-label="Icon"
              />
              <input
                type="text"
                placeholder={
                  section === 'chores'
                    ? 'Chore name (e.g. Water indoor plants)'
                    : 'Reward name (e.g. Trip to Lego Store)'
                }
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newPoints}
                    onChange={(e) => setNewPoints(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-3 pr-16 py-2 text-sm font-bold"
                    required
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500">
                    pts ({pointsToDollarsString(newPoints)})
                  </span>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {items.map((item) => {
              const pts = section === 'chores' ? item.points : item.pointsCost;
              const isEditing = editingId === item.id;

              return (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
                  {isEditing ? (
                    <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        maxLength={4}
                        className="w-12 text-center rounded-lg border border-slate-300 py-1.5 text-base"
                      />
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium"
                      />
                      <input
                        type="number"
                        min="1"
                        value={editPoints}
                        onChange={(e) => setEditPoints(e.target.value)}
                        className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(item.id)}
                        className="rounded-lg bg-emerald-600 text-white p-2 hover:bg-emerald-700 cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg bg-slate-100 text-slate-600 p-2 hover:bg-slate-200 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {pts} pts · {pointsToDollarsString(pts)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            section === 'chores'
                              ? onDeleteChore(item.id)
                              : onDeleteReward(item.id)
                          }
                          className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
