# Vercel Deployment Checklist

## Pre-Deployment

- [ ] All code committed to GitHub
- [ ] Latest changes pushed to `main` branch
- [ ] No uncommitted changes locally
- [ ] All dependencies installed: `npm install`
- [ ] Build test passes locally: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] ESLint checks pass: `npm run lint`

## Firebase Setup

- [ ] Firebase project created (https://console.firebase.google.com)
- [ ] Firebase authentication enabled
- [ ] Firebase service account created
- [ ] Private key saved securely (for `FIREBASE_PRIVATE_KEY`)
- [ ] Firebase config (API key, project ID, etc.) ready

## Vercel Environment Variables

### Public Variables (NEXT_PUBLIC_*)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### Server Variables (Secret)
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
BACKEND_URL=https://your-backend-api.com
```

## Deployment Steps

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up / Log in
   - [ ] Account created and verified

2. **Connect GitHub Repository**
   - [ ] Authorized GitHub account with Vercel
   - [ ] Repository selected for import

3. **Import Project**
   - [ ] Project name set
   - [ ] Root directory: `novax-landing-page`
   - [ ] Framework: Next.js (auto-detected)
   - [ ] Build settings confirmed

4. **Configure Environment Variables**
   - [ ] All public Firebase variables added
   - [ ] All server Firebase variables added
   - [ ] Backend URL configured
   - [ ] All marked as sensitive where appropriate

5. **Deploy**
   - [ ] Initial deployment triggered
   - [ ] Build completes successfully
   - [ ] No deployment errors in logs
   - [ ] Production URL generated

## Post-Deployment Testing

### Functionality Tests
- [ ] Homepage loads
- [ ] Login page accessible
- [ ] Firebase login works (Google OAuth)
- [ ] User can create account
- [ ] User can log out
- [ ] Dashboard loads
- [ ] Can fetch news feed
- [ ] Can access portfolio
- [ ] Can access predictions page
- [ ] Chat functionality works
- [ ] 3D animations display correctly

### Performance Checks
- [ ] Page load time < 3s
- [ ] No console errors in browser DevTools
- [ ] Lighthouse score > 70
- [ ] Mobile responsive design works

### API Integration
- [ ] Backend API calls return data
- [ ] Authentication tokens work
- [ ] Error handling displays properly
- [ ] CORS issues resolved

## Monitoring

- [ ] Vercel Analytics enabled
- [ ] Check deployment logs regularly
- [ ] Monitor error rate (should be < 1%)
- [ ] Check performance metrics

## Rollback Plan

- [ ] Previous commits accessible
- [ ] Can redeploy from git history if needed
- [ ] Keep backup of environment variables

## Domain Setup (Optional)

- [ ] Custom domain purchased
- [ ] DNS records configured
- [ ] SSL certificate auto-provisioned by Vercel
- [ ] Domain pointed to Vercel nameservers

---

**Status**: [ ] Ready for Production | [ ] In Staging | [ ] Development Only
