# NovaX Deployment Guide — Vercel & Backend Setup

## 📋 Project Analysis

### Frontend: **novax-landing-page** (Next.js 15.1.0)
- **Framework**: Next.js 15.1.0 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Authentication**: Firebase (client + admin SDK)
- **Build**: Production-ready, optimized for Vercel
- **Status**: ✅ Ready for Vercel deployment

### Backend: **FastAPI Application**
- **Framework**: FastAPI + Uvicorn
- **Database**: PostgreSQL (SQLAlchemy + asyncpg), MongoDB (motor)
- **Cache**: Redis
- **AI Services**: Google Gemini AI
- **Features**: Web3 integration, ML/LSTM models, News API
- **Status**: ✅ Production-ready (requires separate hosting)

---

## 🚀 Deployment Strategy

### Option 1: Frontend + Serverless Backend (Recommended for Vercel)
**Frontend**: Deploy on Vercel ✅
**Backend**: Deploy on Railway/Render + managed databases

### Option 2: Full-Stack Deployment
**Frontend**: Vercel
**Backend**: Docker on Railway, Render, or AWS

---

## ✅ STEP 1: Deploy Frontend to Vercel

### Prerequisites:
- GitHub account (push your code)
- Vercel account (vercel.com)
- Firebase credentials ready

### 1.1 Prepare Your Frontend Repository

```bash
# Navigate to frontend
cd novax-landing-page

# Install dependencies
npm install

# Test build locally
npm run build
```

### 1.2 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/novax-landing-page.git
git push -u origin main
```

### 1.3 Deploy to Vercel

**Method A: Using Vercel Dashboard (Easiest)**
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Authorize GitHub and select `novax-landing-page`
5. Configure project:
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `novax-landing-page`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

**Method B: Using Vercel CLI**
```bash
npm install -g vercel
cd novax-landing-page
vercel
```

### 1.4 Configure Environment Variables in Vercel

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"

NEXT_PUBLIC_API_URL=https://your-backend-domain.com
BACKEND_URL=https://your-backend-domain.com
```

**Important**: Use `NEXT_PUBLIC_*` for client-side variables only.

---

## 🔧 STEP 2: Deploy Backend (Choose One)

### Option A: Railway.app (Recommended)

**Pros**: Simple Docker support, managed PostgreSQL/MongoDB/Redis
**Cost**: Pay-as-you-go with credits

1. **Create Railway Account**: https://railway.app
2. **Connect GitHub**: Authorize your repository
3. **Create New Project**:
   - Select "Deploy from GitHub"
   - Select your repo
   - Configure root directory: `backend`
4. **Add Services**:
   - Database (PostgreSQL)
   - Database (MongoDB)
   - Redis
5. **Set Environment Variables**:
   ```
   CORS_ORIGINS=https://your-vercel-domain.vercel.app
   JWT_SECRET=your-secure-random-string
   SENTRY_DSN=your-sentry-dsn (optional)
   ```
6. **Deploy**: Railway auto-deploys on push to main

### Option B: Render.com

**Pros**: Free tier available, good for prototyping
**Setup**:
1. Create account at render.com
2. Create Web Service from GitHub
3. Set buildcommand: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

### Option C: Docker + Your Own Server

**Create `backend/Dockerfile`**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Deploy using docker-compose**:
```bash
docker-compose up -d
```

---

## 🔐 Environment Variables Checklist

### Frontend (.env.local)
- [ ] All `NEXT_PUBLIC_FIREBASE_*` variables
- [ ] Server-side Firebase credentials (`FIREBASE_*`)
- [ ] Backend API URL (`NEXT_PUBLIC_API_URL`)

### Backend (.env)
- [ ] `DATABASE_URL` (PostgreSQL)
- [ ] `MONGODB_URL`
- [ ] `REDIS_URL`
- [ ] `JWT_SECRET` (strong, random string)
- [ ] `CORS_ORIGINS` (your Vercel domain)
- [ ] `GOOGLE_API_KEY` (for Gemini AI)
- [ ] `NEWS_API_KEY` (for news API)

---

## 🔗 Update CORS Settings

**In `backend/main.py`**, update CORS middleware:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Where `settings.cors_origins` includes your Vercel domain:
```
CORS_ORIGINS=["https://your-app.vercel.app", "http://localhost:3000"]
```

---

## 📊 Monitoring & Logs

### Vercel
- Dashboard: https://vercel.com/dashboard
- Logs: Deployments → Select deployment → Logs tab
- Performance: Analytics tab

### Railway/Render
- Check deployment logs in dashboard
- Monitor resource usage (CPU, memory)

---

## ✨ Post-Deployment Checklist

- [ ] Frontend builds and deploys successfully
- [ ] Test Firebase authentication flow
- [ ] Backend serves and connects to databases
- [ ] API calls from frontend to backend work
- [ ] Verify all environment variables are set
- [ ] Test AI chat functionality (Gemini API)
- [ ] Verify news feed functionality
- [ ] Check portfolio features
- [ ] Monitor error logs (Sentry if configured)

---

## 🚨 Common Issues & Fixes

### Issue: "CORS error" when frontend calls backend
**Fix**: Add Vercel domain to `CORS_ORIGINS` in backend

### Issue: Firebase authentication fails on production
**Fix**: Verify Firebase credentials are correctly set in Vercel environment

### Issue: ML models fail to load
**Fix**: Ensure weights are committed to Git or download from storage on startup

### Issue: Database connection timeouts
**Fix**: Check firewall rules, ensure database is running, verify connection string

---

## 📚 Useful Resources

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Railway Docs](https://docs.railway.app)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

## 🎯 Next Steps

1. **Immediate**: Push code to GitHub
2. **Day 1**: Deploy frontend to Vercel
3. **Day 2**: Deploy backend to Railway
4. **Day 3**: Test end-to-end integration
5. **Day 4**: Monitor logs and optimize
