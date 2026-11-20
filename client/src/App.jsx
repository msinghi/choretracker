import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckSquare,
  FileSpreadsheet,
  Gift,
  History,
  LogOut,
  RefreshCw,
  Settings,
  Share2,
  Star,
  TrendingUp
} from 'lucide-react';
import KidWalletCards from './components/KidWalletCards';
import DailyLogger from './components/DailyLogger';
import RedeemModal from './components/RedeemModal';
import MoneyTrendChart from './components/MoneyTrendChart';
import CatalogManager from './components/CatalogManager';
import ActivityHistory from './components/ActivityHistory';
import PhoneConnectModal from './components/PhoneConnectModal';
import GoogleSignInScreen from './components/GoogleSignInScreen';
import FamilyOnboardingWizard from './components/FamilyOnboardingWizard';
import {
  addBonusChore,
  clearMemoryCache,
  deleteChoreItem,
  deleteRewardItem,
  deleteTransactionById,
  getBootstrapData,
  loadSavedAuth,
  logChoreAction,
  onGoogleSessionExpired,
  redeemKidPoints,
  requestGoogleAccessToken,
  saveAuth,
  saveChoreItem,
  saveKidProfile,
  saveRewardItem
} from './utils/googleSheetsDb';
import { formatHumanDate, getLocalToday } from './utils/format';

export default function App() {
  const [auth, setAuth] = useState(() => loadSavedAuth());
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  // Dashboard state
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [today, setToday] = useState(getLocalToday());
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [kids, setKids] = useState([]);
  const [chores, setChores] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [dayTransactions, setDayTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Navigation & modals
  const [activeTab, setActiveTab] = useState('log');
  const [trendKidFilter, setTrendKidFilter] = useState('both');
  const [catalogSection, setCatalogSection] = useState('chores');
  const [redeemKid, setRedeemKid] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  useEffect(() => {
    onGoogleSessionExpired(() => {
      setTokenExpired(true);
    });
    // Check if saved Google token already expired
    const saved = loadSavedAuth();
    if (saved?.mode === 'GOOGLE') {
      if (!saved.spreadsheetId) {
        setNeedsOnboarding(true);
      } else if (saved.expiresAt && Date.now() >= saved.expiresAt) {
        setTokenExpired(true);
      }
    } else if (saved?.mode === 'DEMO' && !saved.onboarded) {
      setNeedsOnboarding(true);
    }
  }, []);

  const loadDashboard = useCallback(async (dateToLoad, force = false) => {
    const data = await getBootstrapData(dateToLoad, force);
    setToday(data.today);
    if (data.spreadsheetUrl) setSpreadsheetUrl(data.spreadsheetUrl);
    setKids(data.kids || []);
    setChores(data.chores || []);
    setRewards(data.rewards || []);
    setDayTransactions(data.dayTransactions || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!auth || needsOnboarding || tokenExpired) return;
    setLoading(true);
    loadDashboard(selectedDate).catch((err) => {
      setLoading(false);
      showToast(err.message || 'Could not load Google Sheet');
    });
  }, [auth, needsOnboarding, tokenExpired, selectedDate, loadDashboard]);

  const refreshAll = async (forceSheetFetch = false) => {
    await loadDashboard(selectedDate, forceSheetFetch);
    setRefreshCounter((c) => c + 1);
  };

  const handleReconnectGoogle = async () => {
    try {
      const tokenData = await requestGoogleAccessToken({
        prompt: '',
        loginHint: auth?.user?.email || ''
      });
      const updated = {
        ...auth,
        accessToken: tokenData.accessToken,
        expiresAt: tokenData.expiresAt
      };
      saveAuth(updated);
      setAuth(updated);
      setTokenExpired(false);
      clearMemoryCache();
      showToast('Reconnected to Google Sheets!');
    } catch (err) {
      showToast(err.message || 'Could not reconnect');
    }
  };

  const handleSignOut = () => {
    if (auth?.accessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(auth.accessToken, () => {});
      } catch {
        // ignore
      }
    }
    clearMemoryCache();
    saveAuth(null);
    setAuth(null);
    setNeedsOnboarding(false);
    setTokenExpired(false);
    setKids([]);
    setDayTransactions([]);
  };

  const handleStartDemo = () => {
    const existingDemo = localStorage.getItem('chore_tracker_demo_db_v1');
    const demoAuth = {
      mode: 'DEMO',
      onboarded: Boolean(existingDemo),
      user: { name: 'Demo Parent', email: 'Browser Demo Storage' }
    };
    saveAuth(demoAuth);
    setAuth(demoAuth);
    setNeedsOnboarding(!existingDemo);
  };

  // Actions
  const handleChoreAction = async (kidId, choreId, date, action) => {
    try {
      await logChoreAction({ kidId, choreId, date, action });
      await refreshAll();
    } catch (err) {
      showToast(err.message || 'Could not update chore');
    }
  };

  const handleAddBonus = async (payload) => {
    await addBonusChore(payload);
    showToast(`Added +${payload.points} bonus pts!`);
    await refreshAll();
  };

  const handleRedeem = async (payload) => {
    await redeemKidPoints(payload);
    showToast(`Redeemed ${payload.points} pts ($${(payload.points / 10).toFixed(2)})!`);
    await refreshAll();
  };

  const handleDeleteTransaction = async (txId) => {
    try {
      await deleteTransactionById(txId);
      showToast('Entry removed');
      await refreshAll();
    } catch (err) {
      showToast(err.message || 'Could not delete entry');
    }
  };

  const handleSaveChore = async (chore) => {
    await saveChoreItem(chore);
    showToast(chore.id ? 'Chore updated' : 'Chore added');
    await refreshAll();
  };

  const handleDeleteChore = async (id) => {
    await deleteChoreItem(id);
    showToast('Chore removed');
    await refreshAll();
  };

  const handleSaveReward = async (reward) => {
    await saveRewardItem(reward);
    showToast(reward.id ? 'Reward updated' : 'Reward added');
    await refreshAll();
  };

  const handleDeleteReward = async (id) => {
    await deleteRewardItem(id);
    showToast('Reward removed');
    await refreshAll();
  };

  const handleSaveKid = async (kidPayload) => {
    await saveKidProfile(kidPayload);
    showToast(kidPayload.id ? 'Kid profile updated!' : 'Added kid profile!');
    await refreshAll();
  };

  // 1. Not signed in yet -> Google Sign-In Screen
  if (!auth) {
    return (
      <GoogleSignInScreen
        onSignedIn={(newAuth, { needsOnboarding: onboard }) => {
          setAuth(newAuth);
          setNeedsOnboarding(onboard);
          setTokenExpired(false);
        }}
        onStartDemo={handleStartDemo}
      />
    );
  }

  // 2. Brand-new family -> First-time Kids & Sheet Auto-Creation Wizard
  if (needsOnboarding) {
    return (
      <FamilyOnboardingWizard
        auth={auth}
        onComplete={(updatedAuth) => {
          setAuth(updatedAuth);
          setNeedsOnboarding(false);
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  const navItems = [
    { id: 'log', label: 'Log Chores', icon: CheckSquare },
    { id: 'trend', label: 'Money Trend', icon: TrendingUp },
    { id: 'history', label: 'History', icon: History },
    { id: 'catalog', label: 'Catalog & Kids', icon: Settings }
  ];

  const isDemo = auth.mode === 'DEMO';

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-tight">
                  Family Chore Tracker
                </h1>
                {isDemo && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-extrabold shrink-0">
                    Demo Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                {auth.user?.email || '10 points = $1.00'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isDemo && spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                title="Open Your Google Sheet in Drive"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-2 text-xs font-bold text-emerald-800 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden md:inline">My Sheet</span>
              </a>
            )}

            {!isDemo && (
              <button
                type="button"
                onClick={() => refreshAll(true)}
                title="Sync from Google Sheet"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 p-2 text-slate-600 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              title="Open on Phone or Share with Other Families"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span className="hidden md:inline">Share</span>
            </button>

            {kids.length > 0 && (
              <button
                type="button"
                onClick={() => setRedeemKid(kids[0])}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <Gift className="w-4 h-4 text-amber-300" />
                <span className="hidden xs:inline">Redeem</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 px-2.5 py-2 text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-5 space-y-5">
        {/* Session renewal banner if 60-min browser OAuth token expired */}
        {tokenExpired && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-amber-950">
              <strong>Google Session Paused:</strong> Browser Google tokens refresh hourly for security. Reconnect in 1 tap to continue syncing your Sheet.
            </div>
            <button
              type="button"
              onClick={handleReconnectGoogle}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold cursor-pointer"
            >
              Reconnect Google
            </button>
          </div>
        )}

        {loading && kids.length === 0 ? (
          <div className="py-20 text-center text-sm font-medium text-slate-400">
            Loading your family&apos;s Google Sheet...
          </div>
        ) : (
          <>
            <KidWalletCards
              kids={kids}
              selectedDateLabel={formatHumanDate(selectedDate, today)}
              isToday={selectedDate === today}
              onOpenRedeem={(kid) => setRedeemKid(kid)}
              onSelectTrendTab={(kidKey) => {
                setTrendKidFilter(kidKey);
                setActiveTab('trend');
              }}
            />

            <nav className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-slate-200/70 p-1.5 w-fit">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {activeTab === 'log' && (
              <DailyLogger
                isParent={true}
                today={today}
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                kids={kids}
                chores={chores}
                dayTransactions={dayTransactions}
                onChoreAction={handleChoreAction}
                onAddBonus={handleAddBonus}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateCatalog={() => {
                  setCatalogSection('chores');
                  setActiveTab('catalog');
                }}
              />
            )}

            {activeTab === 'trend' && (
              <MoneyTrendChart
                kids={kids}
                initialKidFilter={trendKidFilter}
                refreshSignal={refreshCounter}
              />
            )}

            {activeTab === 'history' && (
              <ActivityHistory
                kids={kids}
                today={today}
                refreshSignal={refreshCounter}
                onDeleteTransaction={handleDeleteTransaction}
                onJumpToDate={(date) => {
                  setSelectedDate(date);
                  setActiveTab('log');
                }}
              />
            )}

            {activeTab === 'catalog' && (
              <CatalogManager
                kids={kids}
                chores={chores}
                rewards={rewards}
                initialSection={catalogSection}
                onSaveChore={handleSaveChore}
                onDeleteChore={handleDeleteChore}
                onSaveReward={handleSaveReward}
                onDeleteReward={handleDeleteReward}
                onSaveKid={handleSaveKid}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer ${
                  active ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto z-50 flex justify-center sm:justify-end pointer-events-none">
          <div className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <RedeemModal
        isOpen={Boolean(redeemKid)}
        onClose={() => setRedeemKid(null)}
        kids={kids}
        initialKid={redeemKid}
        rewards={rewards}
        today={today}
        defaultDate={selectedDate}
        onRedeem={handleRedeem}
        onManageRewards={() => {
          setCatalogSection('rewards');
          setActiveTab('catalog');
        }}
      />

      <PhoneConnectModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        spreadsheetUrl={spreadsheetUrl}
      />
    </div>
  );
}
