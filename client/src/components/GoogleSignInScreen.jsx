import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Key,
  Play,
  ShieldCheck,
  Star,
  TrendingUp
} from 'lucide-react';
import {
  fetchGoogleUserProfile,
  findExistingFamilySheet,
  getGoogleClientId,
  requestGoogleAccessToken,
  sanitizeClientId,
  saveAuth,
  setCustomGoogleClientId
} from '../utils/googleSheetsDb';

export default function GoogleSignInScreen({ onSignedIn, onStartDemo }) {
  const hasBakedEnvClientId = Boolean(import.meta.env?.VITE_GOOGLE_CLIENT_ID);
  const [clientIdInput, setClientIdInput] = useState(getGoogleClientId());
  const [showClientConfig, setShowClientConfig] = useState(!getGoogleClientId());
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const isRawIpHost =
    typeof window !== 'undefined' && /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

  const handleGoogleSignIn = async () => {
    setError('');
    if (isRawIpHost) {
      setError(
        `Google OAuth blocks raw IP addresses (${window.location.origin}). Open http://localhost:${window.location.port || 3000} instead!`
      );
      return;
    }

    const effectiveClientId = sanitizeClientId(
      hasBakedEnvClientId ? import.meta.env.VITE_GOOGLE_CLIENT_ID : clientIdInput
    );

    if (!effectiveClientId) {
      setShowClientConfig(true);
      setError('Please enter your Google OAuth Web Client ID below first (or try Demo Mode).');
      return;
    }

    if (!effectiveClientId.endsWith('.apps.googleusercontent.com')) {
      setShowClientConfig(true);
      setError(
        'Invalid Client ID format — make sure it ends with .apps.googleusercontent.com (not the Client Secret).'
      );
      return;
    }

    if (!hasBakedEnvClientId) {
      setClientIdInput(effectiveClientId);
      setCustomGoogleClientId(effectiveClientId);
    }

    setBusy(true);
    setStatusText('Opening Google Sign-In...');
    try {
      const tokenData = await requestGoogleAccessToken({ prompt: 'consent' });
      setStatusText('Loading your Google profile...');
      const user = await fetchGoogleUserProfile(tokenData.accessToken);

      // Save temporary auth so Drive lookup can run
      const baseAuth = {
        mode: 'GOOGLE',
        accessToken: tokenData.accessToken,
        expiresAt: tokenData.expiresAt,
        user,
        spreadsheetId: null,
        spreadsheetUrl: null
      };
      saveAuth(baseAuth);

      setStatusText('Checking your Google Drive for an existing Chore Sheet...');
      const existingSheet = await findExistingFamilySheet();

      if (existingSheet) {
        const fullAuth = {
          ...baseAuth,
          spreadsheetId: existingSheet.spreadsheetId,
          spreadsheetUrl: existingSheet.spreadsheetUrl
        };
        saveAuth(fullAuth);
        onSignedIn(fullAuth, { needsOnboarding: false });
      } else {
        onSignedIn(baseAuth, { needsOnboarding: true });
      }
    } catch (err) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setBusy(false);
      setStatusText('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 p-7 text-white text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mb-3 shadow-sm">
            <Star className="w-7 h-7 fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Family Chore Tracker
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-1.5 leading-relaxed">
            Track kids&apos; daily chores, convert points to dollars (<strong>10 pts = $1.00</strong>), and visualize savings—stored privately in your own Google Sheet.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Feature Highlights */}
          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Auto-Creates Your Sheet:</strong> On first sign-in, we create a formatted Google Sheet in your Drive automatically—zero scripting or servers needed.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>100% Private (`drive.file` scope):</strong> Only accesses the single Chore Tracker spreadsheet it creates—never your other Drive files.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>
                <strong>Retroactive Chores, Rewards &amp; Trends:</strong> Log missed days anytime, redeem points, and watch each kid&apos;s balance grow.
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {/* Primary Sign in with Google Button */}
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-4 text-sm font-bold shadow-md transition cursor-pointer disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.3 0 10.6 0 12s.6 3.7 1.6 5.6l3.7-2.8z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 16.1C3.5 19.9 7.4 23 12 23z"
              />
            </svg>
            <span>{busy ? statusText || 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* OAuth Client ID setup panel (only visible when VITE_GOOGLE_CLIENT_ID is not baked into build) */}
          {!hasBakedEnvClientId && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowClientConfig((v) => !v)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  {clientIdInput ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OAuth Client ID Configured
                    </span>
                  ) : (
                    'App Owner Setup: Google OAuth Client ID'
                  )}
                </span>
                {showClientConfig ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showClientConfig && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-slate-200/70 text-xs text-slate-600">
                  <p>
                    To enable 1-click Google Sign-In for all families, create one free <strong>Web application OAuth Client ID</strong> in Google Cloud Console:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                    <li>
                      Enable <strong>Google Sheets API</strong> &amp; <strong>Google Drive API</strong>.
                    </li>
                    <li>
                      In OAuth Consent Screen, add scope <code>.../auth/drive.file</code>.
                    </li>
                    <li>
                      Create <strong>OAuth Client ID (Web application)</strong> and add{' '}
                      <code>{window.location.origin}</code> under <em>Authorized JavaScript origins</em>.
                    </li>
                    <li>
                      Set <code>VITE_GOOGLE_CLIENT_ID</code> in GitHub Actions Variables so visitors never see this box!
                    </li>
                  </ol>
                  <input
                    type="text"
                    placeholder="123456789-abc...apps.googleusercontent.com"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Instant Interactive Demo Mode */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onStartDemo}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-indigo-600" />
              Try Interactive Demo First (Browser Storage)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
