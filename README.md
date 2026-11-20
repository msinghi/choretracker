# Family Chore Tracker (100% Static · Google Sheets Backend)

A multi-family chore & allowance tracker (`10 points = $1.00`) hosted for free on **GitHub Pages** with **zero backend servers** and **zero Apps Script**.

When any parent clicks **Continue with Google**, the app requests only the non-sensitive `drive.file` permission and **automatically creates and formats a private Google Sheet** inside *that parent's* Google Drive.

## 1. One-Time Google Cloud OAuth Client ID Setup (2 Minutes, $0)

To enable **Continue with Google** for yourself and other families:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Go to **APIs & Services → Library** and enable:
   - **Google Sheets API**
   - **Google Drive API**
3. Go to **APIs & Services → OAuth consent screen**:
   - Choose **External**, enter your app name (`Family Chore Tracker`), and add scope `https://www.googleapis.com/auth/drive.file`.
   - *(While in "Testing" mode, add your email under Test Users; click "Publish App" when ready for any family to sign in.)*
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - **Application type:** `Web application`
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `http://localhost:5173`
     - `https://<your-github-username>.github.io` *(no trailing slash or repo path!)*
5. Copy the **Client ID** (`...apps.googleusercontent.com`).

## 2. Test Locally

```bash
npm start
```

Open `http://localhost:3000`. You can either:
- Paste your **OAuth Client ID** on the sign-in screen (or put `VITE_GOOGLE_CLIENT_ID=...` in `.env.local`) and click **Continue with Google**, OR
- Click **Try Interactive Demo First** to test the onboarding wizard and tracker immediately in browser storage.

## 3. Publish to GitHub Pages

1. Push to GitHub (`main` branch).
2. In your GitHub repo, go to **Settings → Secrets and variables → Actions → Variables** and create a repository variable:
   - **Name:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** `<your-client-id>.apps.googleusercontent.com`
3. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Once deployed, any family visiting your `https://<your-github-username>.github.io/<repo>/` URL will only see **Continue with Google**—and their spreadsheet will be created in their own Drive automatically!
