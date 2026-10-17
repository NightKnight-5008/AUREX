# Deployment Guide

## Overview

This guide covers deploying AUREX as a web application to various hosting platforms and as a desktop application with Electron.

---

## Web Deployment

### Option 1: Vercel (Recommended for Quick Deploy)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Production deployment:
```bash
vercel --prod
```

### Automatic Deployment from GitHub

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
   - Install Command: npm install
5. Add environment variables:
   ```
   VITE_API_BASE_URL=https://your-api.com
   VITE_GOOGLE_CLIENT_ID=your-client-id
   ```
6. Click "Deploy"

Result: Automatic deployments on every git push to main branch.

---

### Option 2: Netlify

#### Quick Deploy

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod --dir=dist
```

#### Continuous Deployment

Create netlify.toml:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_OPTIONS = "--max-old-space-size=1792"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

### Option 3: AWS S3 + CloudFront

1. Create S3 bucket:
```bash
aws s3 mb s3://aurex-app
```

2. Configure bucket for static website:
```bash
aws s3 website s3://aurex-app --index-document index.html --error-document index.html
```

3. Update bucket policy (make public):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::aurex-app/*"
  }]
}
```

4. Build and upload:
```bash
npm run build
aws s3 sync dist/ s3://aurex-app --delete
```

5. Create CloudFront distribution pointing to S3 bucket

---

### Option 4: Docker + VPS

Create Dockerfile:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create nginx.conf:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Build and deploy:
```bash
docker build -t aurex-app .
docker run -p 8080:80 aurex-app
```

---

### Option 5: GitHub Pages (Free for Public Repos)

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Update package.json:
```json
{
  "homepage": "https://yourusername.github.io/aurex",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Update vite.config.ts:
```typescript
export default defineConfig({
  base: '/aurex/',
});
```

4. Deploy:
```bash
npm run deploy
```

---

## Desktop Deployment (Electron)

See [DESKTOP.md](./DESKTOP.md) for the complete Electron desktop application guide.

---

## Backend Deployment

### Option A: Railway.app (Easiest)
1. Connect GitHub repo
2. Add PostgreSQL database
3. Deploy automatically

### Option B: Heroku
1. heroku create aurex-api
2. heroku addons:create heroku-postgresql:mini
3. git push heroku main

### Option C: Render.com

The render.yaml file is already configured:

```yaml
services:
  - type: web
    name: aurex-backend
    env: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
```

---

## Performance Optimization

### 1. Enable Compression

```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### 2. Add Cache Headers

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Use CDN

- Cloudflare: Free tier, easy DNS setup
- AWS CloudFront: Best performance, pay-as-you-go
- Fastly: Enterprise-grade

### 4. Optimize Build

```typescript
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['@tanstack/react-router'],
          'ui': ['@radix-ui/react-accordion', '@radix-ui/react-dialog'],
        },
      },
    },
  },
});
```

---

## SSL/HTTPS Setup

### Free SSL with Let's Encrypt (VPS/nginx)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (cron)
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Vercel/Netlify

SSL is automatic - just add your custom domain in dashboard.

---

## Monitoring & Analytics

### Add Error Tracking (Sentry)

```bash
npm install @sentry/react @sentry/vite-plugin
```

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENV,
  tracesSampleRate: 1.0,
});
```

### Add Google Analytics

```typescript
export const initAnalytics = () => {
  if (import.meta.env.VITE_GA_TRACKING_ID) {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_TRACKING_ID}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', import.meta.env.VITE_GA_TRACKING_ID);
  }
};
```

---

## Environment Variables for Production

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-production-client-id
VITE_GOOGLE_REDIRECT_URI=https://yourdomain.com/oauth/callback
VITE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

---

## Deployment Checklist

- [ ] Environment variables configured for production
- [ ] API endpoints point to production backend
- [ ] Mock data removed
- [ ] SSL/HTTPS enabled
- [ ] Custom domain configured
- [ ] Error tracking (Sentry) set up
- [ ] Analytics (Google Analytics) configured
- [ ] Performance optimization applied
- [ ] CDN configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up
