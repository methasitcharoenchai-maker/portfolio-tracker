# 📈 Portfolio Tracker

A portfolio tracker for Stocks, ETFs, Mutual Funds (incl. Thailand funds),
Crypto, and Bank Savings — with optional cloud sync via Firebase.

---

## ✨ Features

- Track Stocks, ETFs, Mutual Funds, Thai Mutual Funds & Crypto in one place
- Manual bank savings accounts (THB/USD) included in net worth
- Live prices via Yahoo Finance (stocks/ETFs) + CoinGecko (crypto)
- Thai mutual fund NAV auto-fetch (FINNOMENA) with manual entry fallback
- USD ⇄ THB currency toggle, applied everywhere instantly
- P&L calculations (per-holding + total) and day change
- **Historical price charts** per holding (1M/3M/6M/1Y/5Y) for stocks/ETFs/crypto
- **CSV export** of your full portfolio + bank savings + summary
- **User accounts** (email/password or Google) via Firebase Auth
- **Cloud sync** — same portfolio across devices, private per user
- Works fully offline too — "Continue without an account" uses localStorage
- Pie chart (allocation) + bar chart (P&L per holding)

---

## 🆓 Free Services Used

| Service | Covers | Key Required? |
|---|---|---|
| Yahoo Finance (via allorigins proxy) | Stocks, ETFs, history | ❌ No |
| CoinGecko | Crypto + crypto history | ❌ No |
| FINNOMENA (best-effort) | Thai mutual fund NAV | ❌ No |
| Firebase Auth + Firestore | Login + cloud sync | ❌ No (free tier) |
| exchangerate-api.com | Live USD/THB rate | ❌ No |

---

## 🚀 Quick Start (Local)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Firebase (for login + cloud sync)
Follow **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** — takes ~10 minutes.

Don't want accounts/sync yet? Skip Firebase setup entirely — the app
still runs and works fully offline via the "Continue without an account"
link on the login screen. You can add Firebase later.

### 3. Run
```bash
npm start
```
Open http://localhost:3000

---

## 📁 Project Structure

```
portfolio-app/
├── src/
│   ├── App.jsx                    # Main app shell, tabs, stats
│   ├── index.js                   # Entry point (wraps app in AuthProvider)
│   ├── firebase/
│   │   └── config.js              # Firebase initialization
│   ├── contexts/
│   │   └── AuthContext.jsx        # Login/signup/logout state
│   ├── hooks/
│   │   └── useCloudPortfolio.js   # Firestore sync + localStorage fallback
│   ├── api/
│   │   ├── prices.js              # Live price fetchers (stocks/crypto/TH funds)
│   │   └── history.js             # Historical price data fetchers
│   ├── components/
│   │   ├── LoginScreen.jsx
│   │   ├── AddHoldingModal.jsx
│   │   ├── AddBankModal.jsx
│   │   ├── HoldingRow.jsx
│   │   ├── BankRow.jsx
│   │   ├── HistoryModal.jsx       # Price history chart popup
│   │   └── Shared.jsx             # Badge, StatCard, CurrencyToggle
│   └── utils/
│       └── csvExport.js
├── firestore.rules                # Security rules (copy into Firebase Console)
├── .env.example                   # Firebase config template
├── FIREBASE_SETUP.md              # Step-by-step Firebase walkthrough
└── DEPLOY.md                      # Vercel deployment guide
```

---

## 📱 How to Use

### Adding Holdings
Click **Add** → choose type (Stock / ETF / Fund / TH Fund / Crypto) → enter
ticker, shares, and average cost.

### Thailand Mutual Funds
Select "TH Fund", enter a code like `SCBUSAA` or `MEGA10-A`. The app tries
to auto-fetch NAV; if unavailable, click **"Enter NAV →"** on the holding
row to type it in yourself (you'll need to refresh it periodically).

### Bank Savings
Go to the **Savings** tab → **Add Bank Account** → enter bank name, balance,
currency. Included in your Net Worth total and allocation chart.

### Viewing Price History
Hover over a Stock/ETF/Crypto holding → click the chart icon → pick a time
range. (Not available for Thai funds — no free historical NAV API exists yet.)

### Exporting to CSV
Click **CSV** in the header — downloads a spreadsheet with all holdings,
bank accounts, and a summary section, converted to your selected display
currency.

### Login & Sync
- Click **Sign Up** to create an account (email/password or Google)
- Your portfolio syncs automatically across any device you log into
- Or skip login entirely — data stays on your current browser only

---

## 🚢 Deployment

This guide is for **local testing only**. When you're ready to deploy to
Vercel and share with friends, see **[DEPLOY.md](./DEPLOY.md)** — including
how to add your Firebase env vars to Vercel securely.

---

## ⚠️ Known Limitations

- Thai mutual fund NAV: no fully reliable free public API exists, so it's
  best-effort auto-fetch + manual fallback
- Historical charts unavailable for Thai funds (same reason)
- Yahoo Finance proxy (allorigins) can occasionally be slow or rate-limited
