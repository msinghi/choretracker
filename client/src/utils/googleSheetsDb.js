// Pure Browser Google Sheets Database Driver (uses non-sensitive `drive.file` OAuth scope)

const STORAGE_AUTH_KEY = 'chore_tracker_google_auth_v1';
const STORAGE_CLIENT_ID_KEY = 'chore_tracker_oauth_client_id';
const DEMO_STATE_KEY = 'chore_tracker_demo_db_v1';
const APP_TAG_KEY = 'app';
const APP_TAG_VALUE = 'chore_tracker_v1';
export const POINTS_PER_DOLLAR = 10;

export const GOOGLE_OAUTH_SCOPES =
  'https://www.googleapis.com/auth/drive.file openid email profile';

export const STARTER_CHORES = [
  { id: 1, title: 'Make Bed', icon: '🛏️', points: 2, active: 1, sort_order: 1 },
  { id: 2, title: 'Pack School Bag & Lunchbox', icon: '🎒', points: 2, active: 1, sort_order: 2 },
  { id: 3, title: 'Tidy Bedroom & Toys', icon: '🧸', points: 3, active: 1, sort_order: 3 },
  { id: 4, title: 'Clear & Wipe Dining Table', icon: '🍽️', points: 3, active: 1, sort_order: 4 },
  { id: 5, title: 'Unload Dishwasher', icon: '🫧', points: 5, active: 1, sort_order: 5 },
  { id: 6, title: 'Fold & Put Away Laundry', icon: '🧺', points: 5, active: 1, sort_order: 6 },
  { id: 7, title: 'Take Out Trash & Recycling', icon: '🗑️', points: 5, active: 1, sort_order: 7 },
  { id: 8, title: 'Vacuum / Sweep Room', icon: '🧹', points: 8, active: 1, sort_order: 8 },
  { id: 9, title: 'Clean Bathroom Sink & Counter', icon: '🚿', points: 10, active: 1, sort_order: 9 },
  { id: 10, title: 'Help with Yard / Car Wash', icon: '🌿', points: 10, active: 1, sort_order: 10 }
];

export const STARTER_REWARDS = [
  { id: 1, title: '30 Min Extra Screen Time', icon: '🎮', points_cost: 20, active: 1, sort_order: 1 },
  { id: 2, title: 'Pick Family Movie Night', icon: '🎬', points_cost: 25, active: 1, sort_order: 2 },
  { id: 3, title: 'Ice Cream Outing', icon: '🍦', points_cost: 30, active: 1, sort_order: 3 },
  { id: 4, title: 'Small Book or Toy', icon: '🎁', points_cost: 50, active: 1, sort_order: 4 },
  { id: 5, title: '$5.00 Cash Payout', icon: '💵', points_cost: 50, active: 1, sort_order: 5 },
  { id: 6, title: '$10.00 Cash Payout', icon: '💵', points_cost: 100, active: 1, sort_order: 6 }
];

// ============================================================================
// AUTH & CLIENT ID STORAGE HELPERS
// ============================================================================

export function sanitizeClientId(raw) {
  return String(raw || '')
    .replace(/^VITE_GOOGLE_CLIENT_ID\s*=\s*/i, '')
    .replace(/['"\s]/g, '')
    .trim();
}

export function getGoogleClientId() {
  const envId = sanitizeClientId(import.meta.env?.VITE_GOOGLE_CLIENT_ID || '');
  if (envId) return envId;
  try {
    return sanitizeClientId(localStorage.getItem(STORAGE_CLIENT_ID_KEY) || '');
  } catch {
    return '';
  }
}

export function setCustomGoogleClientId(clientId) {
  try {
    const cleaned = sanitizeClientId(clientId);
    if (cleaned) {
      localStorage.setItem(STORAGE_CLIENT_ID_KEY, cleaned);
    } else {
      localStorage.removeItem(STORAGE_CLIENT_ID_KEY);
    }
  } catch {
    // ignore
  }
}

export function loadSavedAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuth(authObj) {
  try {
    if (authObj) {
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(authObj));
    } else {
      localStorage.removeItem(STORAGE_AUTH_KEY);
    }
  } catch {
    // ignore
  }
}

let gisScriptPromise = null;
export function loadGisScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisScriptPromise = null;
      reject(new Error('Failed to load Google Identity Services script.'));
    };
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

export async function requestGoogleAccessToken({ prompt = 'consent', loginHint = '' } = {}) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Missing Google OAuth Client ID.');
  }
  await loadGisScript();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_OAUTH_SCOPES,
      hint: loginHint || undefined,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }
        const hasDriveFile = window.google.accounts.oauth2.hasGrantedAllScopes(
          tokenResponse,
          'https://www.googleapis.com/auth/drive.file'
        );
        if (!hasDriveFile) {
          try {
            window.google.accounts.oauth2.revoke(tokenResponse.access_token, () => {});
          } catch {
            // ignore
          }
          reject(
            new Error(
              'Google Drive permission was not checked! Click "Continue with Google" again and make sure to tick the checkbox allowing Chore Tracker to create & edit its own Google Drive file.'
            )
          );
          return;
        }
        const expiresInSec = Number(tokenResponse.expires_in || 3599);
        resolve({
          accessToken: tokenResponse.access_token,
          expiresAt: Date.now() + (expiresInSec - 60) * 1000
        });
      },
      error_callback: (err) => {
        reject(new Error(err?.message || 'Google Sign-In popup was closed or blocked.'));
      }
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

export async function fetchGoogleUserProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch Google account profile.');
  const info = await res.json();
  return {
    email: info.email || '',
    name: info.name || info.given_name || 'Parent',
    picture: info.picture || ''
  };
}

// ============================================================================
// GOOGLE DRIVE & SHEETS V4 REST CLIENT
// ============================================================================

let memoryCache = null; // { spreadsheetId, spreadsheetUrl, sheetIdsByName, kids, chores, rewards, transactions }
let sessionExpiredCallback = null;

export function onGoogleSessionExpired(cb) {
  sessionExpiredCallback = cb;
}

export function clearMemoryCache() {
  memoryCache = null;
}

async function googleFetch(url, options = {}) {
  const saved = loadSavedAuth();
  if (!saved || !saved.accessToken) {
    if (sessionExpiredCallback) sessionExpiredCallback();
    throw new Error('Google session expired. Please reconnect.');
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${saved.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    if (sessionExpiredCallback) sessionExpiredCallback();
    throw new Error('Your Google session expired (1-hour browser limit). Click Reconnect to continue.');
  }

  if (!res.ok) {
    let errText = '';
    try {
      const errJson = await res.json();
      errText = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errText = await res.text();
    }
    throw new Error(errText || `Google API error (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Find existing Chore Tracker spreadsheet created by this app in user's Drive
export async function findExistingFamilySheet() {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and appProperties has { key='${APP_TAG_KEY}' and value='${APP_TAG_VALUE}' }`
  );
  const data = await googleFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=5`
  );
  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    return {
      spreadsheetId: file.id,
      spreadsheetUrl:
        file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`
    };
  }
  return null;
}

// Auto-create & format a brand-new Google Sheet for a new family!
export async function createNewFamilySheet(kidsToCreate, familyTitle = 'Family Chore Tracker') {
  const headerCellFormat = {
    backgroundColor: { red: 0.93, green: 0.95, blue: 1.0 },
    textFormat: { bold: true, foregroundColor: { red: 0.12, green: 0.11, blue: 0.29 } }
  };

  const makeSheetDef = (sheetId, title, colCount) => ({
    properties: {
      sheetId,
      title,
      gridProperties: { frozenRowCount: 1, columnCount: colCount, rowCount: 500 }
    }
  });

  const createPayload = {
    properties: { title: familyTitle },
    sheets: [
      makeSheetDef(1, 'Kids', 5),
      makeSheetDef(2, 'Chores', 6),
      makeSheetDef(3, 'Rewards', 6),
      makeSheetDef(4, 'Transactions', 11)
    ]
  };

  const created = await googleFetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify(createPayload)
  });

  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Tag file in Drive with appProperties so future logins on any device find it automatically
  await googleFetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      appProperties: { [APP_TAG_KEY]: APP_TAG_VALUE }
    })
  });

  // Format header rows bold/tinted
  const formatRequests = [1, 2, 3, 4].map((sheetId) => ({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: headerCellFormat },
      fields: 'userEnteredFormat(backgroundColor,textFormat)'
    }
  }));

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({ requests: formatRequests })
    }
  );

  // Seed initial Kids, Starter Chores, Starter Rewards, and Transactions header
  const kidRows = kidsToCreate.map((k, idx) => [
    idx + 1,
    k.name.trim(),
    k.color || (idx % 2 === 0 ? 'indigo' : 'rose'),
    k.avatar || (idx % 2 === 0 ? '🚀' : '🌟')
  ]);

  const choreRows = STARTER_CHORES.map((c) => [
    c.id,
    c.title,
    c.icon,
    c.points,
    c.active,
    c.sort_order
  ]);

  const rewardRows = STARTER_REWARDS.map((r) => [
    r.id,
    r.title,
    r.icon,
    r.points_cost,
    r.active,
    r.sort_order
  ]);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [
          {
            range: 'Kids!A1',
            values: [['id', 'name', 'color', 'avatar'], ...kidRows]
          },
          {
            range: 'Chores!A1',
            values: [['id', 'title', 'icon', 'points', 'active', 'sort_order'], ...choreRows]
          },
          {
            range: 'Rewards!A1',
            values: [
              ['id', 'title', 'icon', 'points_cost', 'active', 'sort_order'],
              ...rewardRows
            ]
          },
          {
            range: 'Transactions!A1',
            values: [
              [
                'id',
                'kid_id',
                'type',
                'chore_id',
                'reward_id',
                'title_snapshot',
                'icon_snapshot',
                'points',
                'tx_date',
                'note',
                'created_at'
              ]
            ]
          }
        ]
      })
    }
  );

  memoryCache = null;
  return { spreadsheetId, spreadsheetUrl };
}

// ============================================================================
// DATA LAYER (WORKS FOR BOTH REAL GOOGLE SHEETS & BROWSER DEMO MODE)
// ============================================================================

function getLocalTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysStr(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  const ry = dt.getUTCFullYear();
  const rm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const rd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

function parseRowsWithIndex(values = []) {
  if (!values || values.length <= 1) return [];
  const headers = values[0].map((h) => String(h).trim());
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || (row[0] === undefined && row[1] === undefined) || (row[0] === '' && row[1] === '')) {
      continue;
    }
    const obj = { _rowIndex: r }; // 0-based sheet row index
    headers.forEach((h, c) => {
      obj[h] = row[c] !== undefined ? row[c] : '';
    });
    out.push(obj);
  }
  return out;
}

function loadDemoDb() {
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveDemoDb(state) {
  try {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function initDemoFamily(kidsToCreate) {
  const state = {
    kids: kidsToCreate.map((k, idx) => ({
      id: idx + 1,
      name: k.name.trim(),
      color: k.color || (idx % 2 === 0 ? 'indigo' : 'rose'),
      avatar: k.avatar || (idx % 2 === 0 ? '🚀' : '🌟')
    })),
    chores: STARTER_CHORES.map((c) => ({ ...c })),
    rewards: STARTER_REWARDS.map((r) => ({ ...r })),
    transactions: []
  };
  saveDemoDb(state);
  return state;
}

async function ensureSheetStateLoaded(forceRefresh = false) {
  const auth = loadSavedAuth();
  if (auth?.mode === 'DEMO') {
    let demo = loadDemoDb();
    if (!demo) {
      demo = initDemoFamily([
        { name: 'Kid 1', color: 'indigo', avatar: '🚀' },
        { name: 'Kid 2', color: 'rose', avatar: '🌟' }
      ]);
    }
    return { ...demo, spreadsheetUrl: null, isDemo: true };
  }

  const spreadsheetId = auth?.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('No spreadsheet linked yet.');
  }

  if (memoryCache && memoryCache.spreadsheetId === spreadsheetId && !forceRefresh) {
    return memoryCache;
  }

  // Fetch sheet numeric IDs if we don't have them yet
  let sheetIdsByName = memoryCache?.sheetIdsByName || null;
  if (!sheetIdsByName) {
    const meta = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetUrl,sheets.properties(sheetId,title)`
    );
    sheetIdsByName = {};
    for (const s of meta.sheets || []) {
      sheetIdsByName[s.properties.title] = s.properties.sheetId;
    }
  }

  const batch = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Kids!A1:D200&ranges=Chores!A1:F500&ranges=Rewards!A1:F500&ranges=Transactions!A1:K10000&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
  );

  const ranges = batch.valueRanges || [];
  const kids = parseRowsWithIndex(ranges[0]?.values).map((k) => ({
    _rowIndex: k._rowIndex,
    id: Number(k.id),
    name: String(k.name),
    color: String(k.color || 'indigo'),
    avatar: String(k.avatar || '🚀')
  }));

  const chores = parseRowsWithIndex(ranges[1]?.values).map((c) => ({
    _rowIndex: c._rowIndex,
    id: Number(c.id),
    title: String(c.title),
    icon: String(c.icon || '✨'),
    points: Number(c.points),
    active: Number(c.active ?? 1),
    sort_order: Number(c.sort_order || 0)
  }));

  const rewards = parseRowsWithIndex(ranges[2]?.values).map((r) => ({
    _rowIndex: r._rowIndex,
    id: Number(r.id),
    title: String(r.title),
    icon: String(r.icon || '🎁'),
    points_cost: Number(r.points_cost),
    active: Number(r.active ?? 1),
    sort_order: Number(r.sort_order || 0)
  }));

  const transactions = parseRowsWithIndex(ranges[3]?.values).map((t) => ({
    _rowIndex: t._rowIndex,
    id: Number(t.id),
    kid_id: Number(t.kid_id),
    type: String(t.type),
    chore_id: t.chore_id !== '' && t.chore_id != null ? Number(t.chore_id) : null,
    reward_id: t.reward_id !== '' && t.reward_id != null ? Number(t.reward_id) : null,
    title_snapshot: String(t.title_snapshot),
    icon_snapshot: String(t.icon_snapshot || '✨'),
    points: Number(t.points),
    tx_date: String(t.tx_date).slice(0, 10),
    note: String(t.note || ''),
    created_at: String(t.created_at || '')
  }));

  memoryCache = {
    spreadsheetId,
    spreadsheetUrl:
      auth.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetIdsByName,
    kids,
    chores,
    rewards,
    transactions
  };
  return memoryCache;
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) + 1;
}

async function appendSheetRow(tabName, rowValues) {
  const auth = loadSavedAuth();
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${auth.spreadsheetId}/values/${encodeURIComponent(
      `${tabName}!A1`
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [rowValues] })
    }
  );
  memoryCache = null;
}

async function updateSheetRow(tabName, zeroBasedRowIndex, endColLetter, rowValues) {
  const auth = loadSavedAuth();
  const oneBased = zeroBasedRowIndex + 1;
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${auth.spreadsheetId}/values/${encodeURIComponent(
      `${tabName}!A${oneBased}:${endColLetter}${oneBased}`
    )}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [rowValues] })
    }
  );
  memoryCache = null;
}

async function deleteSheetRowsDescending(tabName, zeroBasedIndices) {
  if (!zeroBasedIndices.length) return;
  const state = await ensureSheetStateLoaded();
  const sheetId = state.sheetIdsByName[tabName];
  const sortedDesc = [...zeroBasedIndices].sort((a, b) => b - a);
  const requests = sortedDesc.map((rowIdx) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIdx,
        endIndex: rowIdx + 1
      }
    }
  }));

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${state.spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({ requests })
    }
  );
  memoryCache = null;
}

// ============================================================================
// HIGH-LEVEL APP OPERATIONS
// ============================================================================

export async function getBootstrapData(selectedDate, forceRefresh = false) {
  const state = await ensureSheetStateLoaded(forceRefresh);
  const today = getLocalTodayString();
  const date = selectedDate || today;

  const kidsMap = {};
  for (const k of state.kids) kidsMap[k.id] = k;

  const kidsSummary = state.kids.map((kid) => {
    let earnedTotal = 0;
    let redeemedTotal = 0;
    let earnedOnDate = 0;
    let redeemedOnDate = 0;

    for (const tx of state.transactions) {
      if (tx.kid_id !== kid.id) continue;
      if (tx.type === 'EARN') {
        earnedTotal += tx.points;
        if (tx.tx_date === date) earnedOnDate += tx.points;
      } else if (tx.type === 'REDEEM') {
        redeemedTotal += tx.points;
        if (tx.tx_date === date) redeemedOnDate += tx.points;
      }
    }

    const balancePoints = earnedTotal - redeemedTotal;
    return {
      ...kid,
      balancePoints,
      balanceDollars: Number((balancePoints / POINTS_PER_DOLLAR).toFixed(2)),
      pendingPointsTotal: 0,
      pendingDollarsTotal: 0,
      earnedPointsTotal: earnedTotal,
      earnedDollarsTotal: Number((earnedTotal / POINTS_PER_DOLLAR).toFixed(2)),
      redeemedPointsTotal: redeemedTotal,
      redeemedDollarsTotal: Number((redeemedTotal / POINTS_PER_DOLLAR).toFixed(2)),
      selectedDateEarnedPoints: earnedOnDate,
      selectedDateEarnedDollars: Number((earnedOnDate / POINTS_PER_DOLLAR).toFixed(2)),
      selectedDatePendingPoints: 0,
      selectedDateRedeemedPoints: redeemedOnDate
    };
  });

  const activeChores = state.chores
    .filter((c) => Number(c.active) === 1)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  const activeRewards = state.rewards
    .filter((r) => Number(r.active) === 1)
    .map((r) => ({ ...r, pointsCost: r.points_cost }))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  const dayTransactions = state.transactions
    .filter((t) => t.tx_date === date)
    .map((t) => {
      const k = kidsMap[t.kid_id] || { name: 'Kid', color: 'indigo', avatar: '🚀' };
      return {
        ...t,
        status: 'APPROVED',
        dollars: Number((t.points / POINTS_PER_DOLLAR).toFixed(2)),
        kid_name: k.name,
        kid_color: k.color,
        kid_avatar: k.avatar
      };
    })
    .reverse();

  return {
    today,
    selectedDate: date,
    spreadsheetUrl: state.spreadsheetUrl,
    isDemo: Boolean(state.isDemo),
    kids: kidsSummary,
    chores: activeChores,
    rewards: activeRewards,
    dayTransactions
  };
}

export async function logChoreAction({ kidId, choreId, date, action = 'toggle' }) {
  const state = await ensureSheetStateLoaded();
  const chore = state.chores.find((c) => c.id === Number(choreId));
  if (!chore) throw new Error('Chore not found');

  const matching = state.transactions.filter(
    (t) =>
      t.kid_id === Number(kidId) &&
      t.type === 'EARN' &&
      t.chore_id === Number(choreId) &&
      t.tx_date === date
  );

  if (state.isDemo) {
    const demo = loadDemoDb();
    if (action === 'increment' || (action === 'toggle' && matching.length === 0)) {
      demo.transactions.push({
        id: nextId(demo.transactions),
        kid_id: Number(kidId),
        type: 'EARN',
        chore_id: chore.id,
        reward_id: null,
        title_snapshot: chore.title,
        icon_snapshot: chore.icon,
        points: chore.points,
        tx_date: date,
        note: '',
        created_at: new Date().toISOString()
      });
    } else if (action === 'decrement' && matching.length > 0) {
      const lastId = matching[matching.length - 1].id;
      demo.transactions = demo.transactions.filter((t) => t.id !== lastId);
    } else if (action === 'toggle' && matching.length > 0) {
      const ids = new Set(matching.map((m) => m.id));
      demo.transactions = demo.transactions.filter((t) => !ids.has(t.id));
    }
    saveDemoDb(demo);
    return;
  }

  if (action === 'increment' || (action === 'toggle' && matching.length === 0)) {
    const id = nextId(state.transactions);
    await appendSheetRow('Transactions', [
      id,
      Number(kidId),
      'EARN',
      chore.id,
      '',
      chore.title,
      chore.icon,
      chore.points,
      date,
      '',
      new Date().toISOString()
    ]);
  } else if (action === 'decrement' && matching.length > 0) {
    const last = matching[matching.length - 1];
    await deleteSheetRowsDescending('Transactions', [last._rowIndex]);
  } else if (matching.length > 0) {
    await deleteSheetRowsDescending(
      'Transactions',
      matching.map((m) => m._rowIndex)
    );
  }
}

export async function addBonusChore({ kidId, title, icon = '⭐', points, date, note = '' }) {
  const state = await ensureSheetStateLoaded();
  const pts = Math.round(Number(points));
  if (!title.trim() || pts <= 0) throw new Error('Enter a title and positive points.');

  if (state.isDemo) {
    const demo = loadDemoDb();
    demo.transactions.push({
      id: nextId(demo.transactions),
      kid_id: Number(kidId),
      type: 'EARN',
      chore_id: null,
      reward_id: null,
      title_snapshot: title.trim(),
      icon_snapshot: icon || '⭐',
      points: pts,
      tx_date: date,
      note: note.trim(),
      created_at: new Date().toISOString()
    });
    saveDemoDb(demo);
    return;
  }

  await appendSheetRow('Transactions', [
    nextId(state.transactions),
    Number(kidId),
    'EARN',
    '',
    '',
    title.trim(),
    icon || '⭐',
    pts,
    date,
    note.trim(),
    new Date().toISOString()
  ]);
}

export async function redeemKidPoints({
  kidId,
  rewardId = null,
  title,
  icon = '💵',
  points,
  date,
  note = ''
}) {
  const boot = await getBootstrapData(date);
  const kid = boot.kids.find((k) => k.id === Number(kidId));
  if (!kid) throw new Error('Kid not found.');

  let finalTitle = String(title || '').trim() || 'Cash Out';
  let finalIcon = icon || '💵';
  let finalPoints = Math.round(Number(points));

  if (rewardId) {
    const reward = boot.rewards.find((r) => r.id === Number(rewardId));
    if (!reward) throw new Error('Reward not found.');
    finalTitle = reward.title;
    finalIcon = reward.icon;
    finalPoints = reward.pointsCost;
  }

  if (finalPoints <= 0) throw new Error('Points must be greater than 0.');
  if (finalPoints > kid.balancePoints) {
    throw new Error(
      `${kid.name} currently has ${kid.balancePoints} pts ($${kid.balanceDollars.toFixed(
        2
      )}) available.`
    );
  }

  const state = await ensureSheetStateLoaded();
  if (state.isDemo) {
    const demo = loadDemoDb();
    demo.transactions.push({
      id: nextId(demo.transactions),
      kid_id: kid.id,
      type: 'REDEEM',
      chore_id: null,
      reward_id: rewardId || null,
      title_snapshot: finalTitle,
      icon_snapshot: finalIcon,
      points: finalPoints,
      tx_date: date,
      note: note.trim(),
      created_at: new Date().toISOString()
    });
    saveDemoDb(demo);
    return;
  }

  await appendSheetRow('Transactions', [
    nextId(state.transactions),
    kid.id,
    'REDEEM',
    '',
    rewardId || '',
    finalTitle,
    finalIcon,
    finalPoints,
    date,
    note.trim(),
    new Date().toISOString()
  ]);
}

export async function getTrendSeries(range = '30') {
  const state = await ensureSheetStateLoaded();
  const today = getLocalTodayString();
  const kids = state.kids;

  let minDate = null;
  let maxDate = null;
  for (const tx of state.transactions) {
    if (!minDate || tx.tx_date < minDate) minDate = tx.tx_date;
    if (!maxDate || tx.tx_date > maxDate) maxDate = tx.tx_date;
  }

  const endDate = maxDate && maxDate > today ? maxDate : today;
  let startDate;
  if (range === '7') startDate = addDaysStr(endDate, -6);
  else if (range === '90') startDate = addDaysStr(endDate, -89);
  else if (range === 'all') {
    if (minDate) {
      const oneBefore = addDaysStr(minDate, -1);
      const sevenAgo = addDaysStr(endDate, -6);
      startDate = oneBefore < sevenAgo ? oneBefore : sevenAgo;
    } else {
      startDate = addDaysStr(endDate, -6);
    }
  } else {
    startDate = addDaysStr(endDate, -29);
  }

  const runningPts = {};
  for (const k of kids) runningPts[k.id] = 0;

  const byDate = {};
  for (const tx of state.transactions) {
    if (runningPts[tx.kid_id] === undefined) continue;
    if (tx.tx_date < startDate) {
      runningPts[tx.kid_id] += tx.type === 'EARN' ? tx.points : -tx.points;
    } else if (tx.tx_date <= endDate) {
      if (!byDate[tx.tx_date]) byDate[tx.tx_date] = {};
      if (!byDate[tx.tx_date][tx.kid_id]) {
        byDate[tx.tx_date][tx.kid_id] = { earnedPts: 0, redeemedPts: 0, items: [] };
      }
      const bucket = byDate[tx.tx_date][tx.kid_id];
      if (tx.type === 'EARN') bucket.earnedPts += tx.points;
      else bucket.redeemedPts += tx.points;
      bucket.items.push({
        type: tx.type,
        title: tx.title_snapshot,
        icon: tx.icon_snapshot,
        points: tx.points,
        dollars: Number((tx.points / POINTS_PER_DOLLAR).toFixed(2))
      });
    }
  }

  const series = [];
  let cursor = startDate;
  let guard = 0;
  while (cursor <= endDate && guard < 730) {
    const [, mm, dd] = cursor.split('-');
    const point = {
      date: cursor,
      label: `${Number(mm)}/${Number(dd)}`,
      details: {}
    };

    for (const kid of kids) {
      const key = `kid_${kid.id}`;
      const dayB = (byDate[cursor] && byDate[cursor][kid.id]) || {
        earnedPts: 0,
        redeemedPts: 0,
        items: []
      };
      runningPts[kid.id] += dayB.earnedPts - dayB.redeemedPts;
      const dollars = Number((runningPts[kid.id] / POINTS_PER_DOLLAR).toFixed(2));

      point[`${key}Dollars`] = dollars;
      point[`${key}Points`] = runningPts[kid.id];
      point.details[key] = {
        kidName: kid.name,
        closingPoints: runningPts[kid.id],
        closingDollars: dollars,
        earnedPoints: dayB.earnedPts,
        earnedDollars: Number((dayB.earnedPts / POINTS_PER_DOLLAR).toFixed(2)),
        redeemedPoints: dayB.redeemedPts,
        redeemedDollars: Number((dayB.redeemedPts / POINTS_PER_DOLLAR).toFixed(2)),
        items: dayB.items
      };
    }

    series.push(point);
    cursor = addDaysStr(cursor, 1);
    guard += 1;
  }

  return { range, startDate, endDate, kids, series };
}

export async function listTransactions({ kidId = 'all', type = 'all', limit = 200 } = {}) {
  const state = await ensureSheetStateLoaded();
  const kidsMap = {};
  for (const k of state.kids) kidsMap[k.id] = k;

  const filtered = state.transactions
    .filter((tx) => {
      if (kidId !== 'all' && tx.kid_id !== Number(kidId)) return false;
      if (type !== 'all' && tx.type !== type) return false;
      return true;
    })
    .map((tx) => {
      const k = kidsMap[tx.kid_id] || { name: 'Kid', color: 'indigo', avatar: '🚀' };
      return {
        ...tx,
        status: 'APPROVED',
        dollars: Number((tx.points / POINTS_PER_DOLLAR).toFixed(2)),
        kid_name: k.name,
        kid_color: k.color,
        kid_avatar: k.avatar
      };
    })
    .sort((a, b) => {
      if (a.tx_date !== b.tx_date) return a.tx_date < b.tx_date ? 1 : -1;
      return b.id - a.id;
    });

  return filtered.slice(0, limit);
}

export async function deleteTransactionById(txId) {
  const state = await ensureSheetStateLoaded();
  const target = state.transactions.find((t) => t.id === Number(txId));
  if (!target) return;

  if (state.isDemo) {
    const demo = loadDemoDb();
    demo.transactions = demo.transactions.filter((t) => t.id !== Number(txId));
    saveDemoDb(demo);
    return;
  }

  await deleteSheetRowsDescending('Transactions', [target._rowIndex]);
}

export async function saveChoreItem(chore) {
  const state = await ensureSheetStateLoaded();
  const pts = Math.round(Number(chore.points));
  if (state.isDemo) {
    const demo = loadDemoDb();
    if (chore.id) {
      const idx = demo.chores.findIndex((c) => c.id === Number(chore.id));
      if (idx >= 0) {
        demo.chores[idx] = { ...demo.chores[idx], title: chore.title, icon: chore.icon, points: pts };
      }
    } else {
      const id = nextId(demo.chores);
      demo.chores.push({ id, title: chore.title, icon: chore.icon, points: pts, active: 1, sort_order: id });
    }
    saveDemoDb(demo);
    return;
  }

  if (chore.id) {
    const existing = state.chores.find((c) => c.id === Number(chore.id));
    if (existing) {
      await updateSheetRow('Chores', existing._rowIndex, 'F', [
        existing.id,
        chore.title.trim(),
        chore.icon || '✨',
        pts,
        1,
        existing.sort_order || existing.id
      ]);
      return;
    }
  }
  const id = nextId(state.chores);
  await appendSheetRow('Chores', [id, chore.title.trim(), chore.icon || '✨', pts, 1, id]);
}

export async function deleteChoreItem(id) {
  const state = await ensureSheetStateLoaded();
  if (state.isDemo) {
    const demo = loadDemoDb();
    const idx = demo.chores.findIndex((c) => c.id === Number(id));
    if (idx >= 0) demo.chores[idx].active = 0;
    saveDemoDb(demo);
    return;
  }
  const existing = state.chores.find((c) => c.id === Number(id));
  if (existing) {
    await updateSheetRow('Chores', existing._rowIndex, 'F', [
      existing.id,
      existing.title,
      existing.icon,
      existing.points,
      0,
      existing.sort_order
    ]);
  }
}

export async function saveRewardItem(reward) {
  const state = await ensureSheetStateLoaded();
  const cost = Math.round(Number(reward.pointsCost));
  if (state.isDemo) {
    const demo = loadDemoDb();
    if (reward.id) {
      const idx = demo.rewards.findIndex((r) => r.id === Number(reward.id));
      if (idx >= 0) {
        demo.rewards[idx] = {
          ...demo.rewards[idx],
          title: reward.title,
          icon: reward.icon,
          points_cost: cost
        };
      }
    } else {
      const id = nextId(demo.rewards);
      demo.rewards.push({
        id,
        title: reward.title,
        icon: reward.icon,
        points_cost: cost,
        active: 1,
        sort_order: id
      });
    }
    saveDemoDb(demo);
    return;
  }

  if (reward.id) {
    const existing = state.rewards.find((r) => r.id === Number(reward.id));
    if (existing) {
      await updateSheetRow('Rewards', existing._rowIndex, 'F', [
        existing.id,
        reward.title.trim(),
        reward.icon || '🎁',
        cost,
        1,
        existing.sort_order || existing.id
      ]);
      return;
    }
  }
  const id = nextId(state.rewards);
  await appendSheetRow('Rewards', [id, reward.title.trim(), reward.icon || '🎁', cost, 1, id]);
}

export async function deleteRewardItem(id) {
  const state = await ensureSheetStateLoaded();
  if (state.isDemo) {
    const demo = loadDemoDb();
    const idx = demo.rewards.findIndex((r) => r.id === Number(id));
    if (idx >= 0) demo.rewards[idx].active = 0;
    saveDemoDb(demo);
    return;
  }
  const existing = state.rewards.find((r) => r.id === Number(id));
  if (existing) {
    await updateSheetRow('Rewards', existing._rowIndex, 'F', [
      existing.id,
      existing.title,
      existing.icon,
      existing.points_cost,
      0,
      existing.sort_order
    ]);
  }
}

export async function saveKidProfile(kidPayload) {
  const state = await ensureSheetStateLoaded();
  if (state.isDemo) {
    const demo = loadDemoDb();
    if (kidPayload.id) {
      const idx = demo.kids.findIndex((k) => k.id === Number(kidPayload.id));
      if (idx >= 0) {
        demo.kids[idx] = {
          ...demo.kids[idx],
          name: kidPayload.name.trim(),
          avatar: kidPayload.avatar || '🚀',
          color: kidPayload.color || 'indigo'
        };
      }
    } else {
      const id = nextId(demo.kids);
      demo.kids.push({
        id,
        name: kidPayload.name.trim(),
        avatar: kidPayload.avatar || '🚀',
        color: kidPayload.color || 'indigo'
      });
    }
    saveDemoDb(demo);
    return;
  }

  if (kidPayload.id) {
    const existing = state.kids.find((k) => k.id === Number(kidPayload.id));
    if (existing) {
      await updateSheetRow('Kids', existing._rowIndex, 'D', [
        existing.id,
        kidPayload.name.trim(),
        kidPayload.color || existing.color,
        kidPayload.avatar || existing.avatar
      ]);
      return;
    }
  }
  const id = nextId(state.kids);
  await appendSheetRow('Kids', [
    id,
    kidPayload.name.trim(),
    kidPayload.color || 'indigo',
    kidPayload.avatar || '🚀'
  ]);
}
