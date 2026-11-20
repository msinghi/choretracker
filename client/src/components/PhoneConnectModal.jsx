import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Smartphone,
  X
} from 'lucide-react';

export default function PhoneConnectModal({
  isOpen,
  onClose,
  spreadsheetUrl
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = window.location.origin + window.location.pathname;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">Open on Phone or Share with Families</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          <p className="text-xs text-slate-600">
            Scan on your phone to sign in to your Google Sheet—or share this link with another family so they can create their own private Chore Sheet!
          </p>

          <div className="mx-auto w-fit rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-xs">
            <QRCodeSVG value={shareUrl} size={184} level="M" />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2.5">
            <code className="text-xs font-bold text-indigo-700 truncate">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </>
              )}
            </button>
          </div>

          {spreadsheetUrl && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-bold text-emerald-950 truncate">
                  Your Family Google Sheet
                </span>
              </div>
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold shrink-0"
              >
                Open Sheet
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-3.5 text-left text-xs text-slate-700 space-y-1">
            <div className="font-bold text-indigo-950">💡 Install as iOS / Android App</div>
            <p>
              Open in Safari (iPhone) or Chrome (Android) and tap{' '}
              <strong>Share → Add to Home Screen</strong> for a full-screen app icon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
