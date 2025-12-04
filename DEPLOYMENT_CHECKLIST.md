# 🚀 Vercel Deployment Configuration Checklist

## ✅ Build Configuration Status

### 1. **vercel.json** ✅
- ✅ Framework: Next.js configured
- ✅ Build command: Configured with legacy peer deps support
- ✅ Install command: Configured
- ✅ API routes: Memory (1024MB) and timeout (30s) configured
- ✅ Cron jobs: Cleanup job scheduled (daily at 2 AM) - `/api/cron/cleanup` endpoint created and ready
- ✅ Region: `iad1` (US East)

**Note**: The `rm -rf .next` command in buildCommand is Linux-specific, which is fine since Vercel uses Linux.

### 2. **next.config.mjs** ✅
- ✅ Standalone output mode (optimal for Vercel)
- ✅ ESLint disabled during builds (acceptable for now)
- ✅ Security headers configured
- ✅ Image optimization configured
- ✅ Compression enabled
- ✅ Package optimizations for Prisma and bcrypt

### 3. **Cloud Storage Service** ✅
- ✅ Fixed TypeScript errors in `cloud-storage.service.ts`
- ✅ Supports Vercel Blob (recommended)
- ✅ Environment variable: `CLOUD_STORAGE_PROVIDER="vercel"` or leave unset for local

## ⚠️ Required Environment Variables for Vercel

### Critical (Must Have)
```bash
# Database
DATABASE_URL="postgresql://..."  # Or use Vercel Postgres (auto-provided)

# Authentication & Security
JWT_SECRET="your-secret-key-min-32-chars"
SESSION_SECRET="your-session-secret"
COOKIE_SECRET="your-cookie-secret"
CSRF_SECRET="your-csrf-secret"

# Application
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
NODE_ENV="production"
```

### Recommended (Should Have)
```bash
# Cloud Storage (for file uploads)
CLOUD_STORAGE_PROVIDER="vercel"  # or leave unset for local storage
# Note: Vercel Blob token is auto-provided if using Vercel Blob

# Security
SECURE_COOKIES="true"
REQUIRE_HTTPS="true"

# Redis (for caching/sessions)
REDIS_URL="redis://..."  # Upstash Redis recommended

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@icct.edu.ph"
```

### Optional (Nice to Have)
```bash
# MQTT (for RFID functionality)
MQTT_BROKER_URL="mqtt://..."
MQTT_USERNAME="..."
MQTT_PASSWORD="..."

# Rate Limiting
RATE_LIMIT_WINDOW="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Monitoring
LOG_LEVEL="info"
ENABLE_MONITORING="true"
```

## 🔍 Configuration Issues Found

### ✅ All Clear!
No critical configuration issues found. The project is properly configured for Vercel deployment.

## 📋 Pre-Deployment Steps

### 1. **Set Up External Services**
   - [ ] Set up Vercel Postgres (recommended) OR configure external PostgreSQL
   - [ ] Configure Redis (Upstash recommended) OR leave unset if not needed
   - [ ] Set up MQTT broker (if using RFID features) OR leave unset
   - [ ] Configure SMTP for email (if using email features) OR leave unset

### 2. **Configure Environment Variables in Vercel**
   - [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - [ ] Add all required environment variables listed above
   - [ ] Set variables for Production, Preview, and Development environments as needed

### 3. **Vercel Blob Storage (Recommended)**
   - [ ] Install Vercel Blob addon in Vercel Dashboard (if not already)
   - [ ] Set `CLOUD_STORAGE_PROVIDER="vercel"` OR leave unset to use local storage
   - [ ] Note: `BLOB_READ_WRITE_TOKEN` is auto-provided by Vercel

### 4. **Database Migration**
   - [ ] After first deployment, run Prisma migrations:
     ```bash
     npx prisma migrate deploy
     ```
   - [ ] Or use Vercel Postgres migration script:
     ```bash
     npm run setup:vercel-postgres
     ```

## 🚀 Deployment Steps

1. **Connect Repository to Vercel**
   - [ ] Push code to GitHub/GitLab/Bitbucket
   - [ ] Import project in Vercel Dashboard
   - [ ] Configure build settings (should auto-detect from `vercel.json`)

2. **Set Environment Variables**
   - [ ] Add all required variables in Vercel Dashboard
   - [ ] Verify `NEXT_PUBLIC_APP_URL` matches your Vercel domain

3. **Deploy**
   - [ ] Trigger deployment (automatic on git push or manual)
   - [ ] Monitor build logs for errors
   - [ ] Verify deployment succeeds

4. **Post-Deployment**
   - [ ] Run database migrations
   - [ ] Test application functionality
   - [ ] Verify file uploads work (cloud or local storage)
   - [ ] Check API routes are accessible
   - [ ] Test authentication flow

## 🔧 Potential Issues & Solutions

### Issue 1: Build Fails with Dependency Errors
**Solution**: The `vercel.json` already includes `--legacy-peer-deps` flag, which should handle most peer dependency conflicts.

### Issue 2: API Routes Timeout
**Solution**: API routes are configured with 30s timeout and 1024MB memory in `vercel.json`. For longer operations, consider:
- Using Vercel Edge Functions
- Moving heavy processing to background jobs
- Using Vercel Cron for scheduled tasks

### Issue 3: Database Connection Issues
**Solution**: 
- Use Vercel Postgres for easiest setup (auto-configures `DATABASE_URL`)
- For external databases, ensure connection string is correct
- Check database allows connections from Vercel IPs

### Issue 4: File Upload Issues
**Solution**:
- If using cloud storage: Ensure `CLOUD_STORAGE_PROVIDER` is set correctly
- If using local storage: Note that Vercel has ephemeral file system (files reset on deploy)
- **Recommendation**: Use Vercel Blob for persistent file storage

### Issue 5: Static File Serving
**Solution**: Files in `public/` directory are automatically served. Ensure:
- Files are committed to repository
- Or use cloud storage for dynamic files

## 📝 Notes

- **File System**: Vercel uses an ephemeral file system. Files written to disk during runtime will be lost on redeploy. Use cloud storage for persistent files.
- **Build Time**: The build command cleans `.next` folder, which is good practice.
- **Security**: All security headers are configured in `next.config.mjs`.
- **Performance**: Standalone output mode is configured for optimal performance on Vercel.

## 🎯 Quick Deployment Commands

```bash
# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy:prod

# Setup Vercel Postgres
npm run setup:vercel-postgres

# Setup cloud storage
npm run setup:cloud-storage
```

## ✅ Final Checklist Before Deploying

- [ ] All required environment variables are configured in Vercel Dashboard
- [ ] Database is accessible and migrations are ready
- [ ] Cloud storage is configured (or local storage is acceptable)
- [ ] Build completes successfully locally (`npm run build`)
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] No critical linter errors
- [ ] `NEXT_PUBLIC_APP_URL` matches your Vercel domain
- [ ] Security secrets (JWT, Session, Cookie, CSRF) are generated and secure

---

**Status**: ✅ **Ready for Deployment**

All configuration files are properly set up. Follow the pre-deployment steps above and deploy to Vercel.

