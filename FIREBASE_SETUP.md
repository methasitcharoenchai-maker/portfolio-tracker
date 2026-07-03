# 🔥 Firebase Setup Guide (Login + Cloud Sync)

This app now supports user accounts and cloud-synced portfolios via Firebase.
Follow these steps once to set it up — takes about 10 minutes.

---

## Step 1: Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it something like `portfolio-tracker` → Continue
4. Disable Google Analytics (not needed) → **Create project**
5. Wait ~30 seconds for it to provision

---

## Step 2: Register a Web App

1. On your new project's home page, click the **`</>`** (web) icon
2. App nickname: `portfolio-tracker-web` → **Register app**
3. **Copy the `firebaseConfig` object shown** — you'll need these 6 values:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAEM6utujtDOjs707CZMkE-811vezFWOq8",
  authDomain: "my-portfolio-v1-1bae9.firebaseapp.com",
  projectId: "my-portfolio-v1-1bae9",
  storageBucket: "my-portfolio-v1-1bae9.firebasestorage.app",
  messagingSenderId: "1025070398817",
  appId: "1:1025070398817:web:68acef108c638fb5205920"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
4. Click **Continue to console** (skip the SDK install instructions, already done)

---

## Step 3: Enable Authentication

1. In the left sidebar: **Build → Authentication** → **Get started**
2. Under **Sign-in method**, enable:
   - **Email/Password** → toggle Enable → Save
   - **Google** → toggle Enable → pick a support email → Save

---

## Step 4: Create the Firestore Database

1. Left sidebar: **Build → Firestore Database** → **Create database**
2. Choose **Start in production mode** → Next
3. Pick a location close to you/Thailand (e.g. `asia-southeast1`) → Enable

---

## Step 5: Apply Security Rules

1. In Firestore Database, click the **Rules** tab
2. Delete the existing content and paste in the contents of `firestore.rules`
   (included in this project) — it ensures each person can only access their
   own data, even though everyone shares the same deployed app
3. Click **Publish**

---

## Step 6: Connect Your Local App

1. In your project folder, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste in your 6 values from Step 2:
   ```
   REACT_APP_FIREBASE_API_KEY=AIzaSy...
   REACT_APP_FIREBASE_AUTH_DOMAIN=portfolio-tracker-xxxxx.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=portfolio-tracker-xxxxx
   REACT_APP_FIREBASE_STORAGE_BUCKET=portfolio-tracker-xxxxx.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
   REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abc123def456
   ```
3. **Never commit `.env`** — it's already in `.gitignore`. These values are
   technically safe to expose (Firebase's real security is the Firestore
   Rules from Step 5), but keeping them out of git is still good hygiene.

---

## Step 7: Run Locally

```bash
npm install
npm start
```

Open http://localhost:3000 — you should see the login screen.

### Testing it works
1. Click **Sign Up**, create a test account with any email/password
2. Add a holding — it should save instantly
3. Open Firebase Console → Firestore Database → Data tab
4. You should see a `users` collection with a document matching your test
   account's UID, containing your holdings

---

## How Login + Sync Works

- **Without an account**: app works fully offline using browser localStorage
  (click "Continue without an account" on the login screen)
- **With an account**: data syncs to Firestore under `users/{your-uid}`
- **Multiple devices**: log into the same account anywhere → same portfolio
- **Friends**: each person creates their own free account → completely
  separate, private portfolios, enforced by the Firestore Rules

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Firebase: Error (auth/configuration-not-found)" | Email/Password or Google sign-in not enabled — redo Step 3 |
| Blank screen, console shows Firebase error | Check `.env` values match exactly what's in Firebase Console |
| Data not saving when logged in | Check Firestore Rules were published (Step 5) |
| "Missing or insufficient permissions" | Firestore Rules not published yet, or rules have a typo |
| Google sign-in popup blocked | Browser blocking popups — allow popups for localhost |

---

## Cost

Firebase's free "Spark" plan includes:
- 50,000 monthly active users (Auth)
- 1 GB stored data + 50,000 reads/20,000 writes per day (Firestore)

For a portfolio tracker shared with friends, you will not come close to these
limits. This stays free indefinitely at this scale.
