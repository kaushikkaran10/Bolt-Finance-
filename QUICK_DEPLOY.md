# Quick Start: Deploy NovaX to Vercel

## 🚀 5-Minute Deployment

### Step 1: Push to GitHub
```bash
cd ~/Desktop/bolt
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/novax.git
git push -u origin main
```

### Step 2: Visit Vercel
1. Open https://vercel.com/dashboard
2. Click **"Add New" → "Project"**
3. Click **"Import Git Repository"**
4. Search for your repository and select it

### Step 3: Configure
1. **Root Directory**: Select `novax-landing-page`
2. **Framework Preset**: `Next.js` (auto-detected)
3. Click **"Continue"**

### Step 4: Environment Variables
Add these in the "Environment Variables" section:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_API_URL=https://your-backend.com
BACKEND_URL=https://your-backend.com
```

### Step 5: Deploy
Click **"Deploy"** and wait 2-3 minutes

### Step 6: Verify
- Check your new URL (e.g., `novax.vercel.app`)
- Test login functionality
- Check frontend works

---

## 📝 Get Your Firebase Credentials

1. Go to https://console.firebase.google.com
2. Select your project (or create new one)
3. Go to **Settings ⚙️ → Project Settings**
4. Copy credentials (Web SDK config)
5. Go to **Service Accounts → Generate New Private Key**
6. Copy the JSON file contents for server-side variables

---

## 🔗 Backend Deployment (Separate from Vercel)

Since FastAPI requires PostgreSQL, MongoDB, and Redis, deploy separately:

**Option A: Railway (Easiest)**
- Visit https://railway.app
- Connect GitHub → Select repository
- Railway auto-deploys backend
- Add PostgreSQL, MongoDB, Redis services

**Option B: Render**
- Visit https://render.com
- Create Web Service from GitHub
- Set build command: `pip install -r requirements.txt`
- Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## ✅ After Deployment

- [ ] Visit your Vercel URL
- [ ] Test login
- [ ] Update `NEXT_PUBLIC_API_URL` to your backend URL
- [ ] Test API calls work
- [ ] Check no console errors

---

## 🆘 Troubleshooting

**Build fails?**
→ Check `npm run build` works locally first

**Firebase error?**
→ Verify all Firebase environment variables are set

**CORS error calling backend?**
→ Update backend `CORS_ORIGINS` to include your Vercel domain

**Page loads but seems broken?**
→ Check browser console (F12) for errors
