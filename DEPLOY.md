# 🚀 GitHub + Vercel Deployment Guide
## Fix the `node_modules` Error & Deploy Clean

---

## 🔴 What Went Wrong (and Why)

The error:
```
sh: line 1: /vercel/path0/node_modules/.bin/react-scripts: Permission denied
```

**Root cause:** `node_modules/` was accidentally committed to Git.
Vercel tried to use those committed binaries (which have wrong file permissions
on Linux) instead of installing clean ones.

**Evidence:** Your push had 37,136 files — a normal React project has ~10 files.
Everything over that was `node_modules/`.

---

## ✅ The Fix — Step by Step

### Step 1: Delete your broken GitHub repo

1. Go to: https://github.com/methasitcharoenchai-maker
2. Open the old repo → **Settings** → scroll to bottom → **Delete this repository**
3. Confirm deletion

---

### Step 2: Prepare your local project

Open Terminal (Mac/Linux) or Git Bash (Windows) in your project folder:

```bash
# Go to your project folder
cd portfolio-app

# ── CRITICAL: Remove node_modules from Git tracking ──
# (The .gitignore file in this project already prevents future commits)
# But if node_modules is already tracked, run:
git rm -r --cached node_modules 2>/dev/null || echo "Already clean"
git rm -r --cached build 2>/dev/null || echo "Already clean"

# Verify .gitignore exists and has node_modules
cat .gitignore
# You should see:  node_modules/
```

---

### Step 3: Create a fresh GitHub repo

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `portfolio-tracker`
   - **Visibility:** Public (required for free Vercel)
   - ❌ Do NOT check "Add README" or "Add .gitignore" (we already have them)
3. Click **Create repository**
4. Copy the URL shown (e.g. `https://github.com/methasitcharoenchai-maker/portfolio-tracker.git`)

---

### Step 4: Push ONLY your source code

```bash
# Inside your portfolio-app folder:

# Initialize Git (skip if already done)
git init

# Stage ONLY source files (node_modules is excluded by .gitignore automatically)
git add .

# Verify what's being committed — should be ~10 files, NOT 37,000
git status
# ✅ Good:  src/, public/, package.json, tailwind.config.js, .gitignore, etc.
# ❌ Bad:   if you see node_modules/ listed, stop and re-check .gitignore

# Count files to confirm (should be < 20)
git status --short | wc -l

# Commit
git commit -m "Initial portfolio tracker"

# Link to your GitHub repo (replace URL with yours)
git remote add origin https://github.com/methasitcharoenchai-maker/portfolio-tracker.git

# Push
git branch -M main
git push -u origin main
```

**✅ Expected: Push says ~10-15 files. If it says 37,000+ — STOP, check .gitignore.**

---

### Step 5: Deploy on Vercel

1. Go to https://vercel.com → Sign up / Log in with GitHub
2. Click **"Add New Project"**
3. Find and click **"Import"** next to `portfolio-tracker`
4. Vercel auto-detects Create React App ✅
5. Settings to verify:
   - **Framework Preset:** Create React App
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install` (Vercel fills this in automatically)
6. Click **Deploy** 🚀
7. Wait ~2 minutes
8. Get your live URL: `https://portfolio-tracker-xxx.vercel.app`

---

## 🎯 Share with Friends

Just send them your Vercel URL — no login needed for them.
Each person's portfolio data is saved in their own browser.

---

## ❓ Troubleshooting

| Error | Fix |
|-------|-----|
| `Permission denied` on react-scripts | `node_modules` was committed — redo Steps 1-4 |
| Build fails with missing module | Run `npm install` locally first, then push |
| White screen after deploy | Check browser console; likely a missing import |
| "Not found" on Vercel | Check Output Directory is set to `build` |

---

## 🔁 After First Deploy: Update Your App

Whenever you make changes:
```bash
git add .
git commit -m "describe your change"
git push
# Vercel auto-deploys in ~1 minute ✨
```

---

## 📁 Your Correct File Structure (should look like this in GitHub)

```
portfolio-tracker/
├── .gitignore          ← MUST exist, MUST contain node_modules/
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── README.md
├── public/
│   └── index.html
└── src/
    ├── App.jsx
    ├── index.js
    └── index.css
```

**Total: ~10 files. NOT 37,000.**
