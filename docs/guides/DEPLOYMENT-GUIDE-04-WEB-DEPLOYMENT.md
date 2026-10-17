# Step 4: Web Deployment

This guide covers deploying AUREX as a web application to various hosting platforms.

## Overview

Choose one of these deployment platforms based on your needs:
- **Vercel**: Fastest setup, automatic deployments
- **Netlify**: Great for static sites, excellent CDN
- **AWS**: Most control, enterprise-ready
- **Self-hosted VPS**: Complete control

---

## Option 1: Vercel (Recommended for Quick Deploy)

### Steps:

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

4. **Production deployment**:
```bash
vercel --prod
```

### Automatic Deployment from GitHub

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add environment variables:
   ```
   VITE_API_BASE_URL=https://your-api.com
   VITE_GOOGLE_CLIENT_ID=your-client-id
   ```

6. Click "Deploy"

**Result**: Automatic deployments on every git push to main branch.

---

## Option 2: Netlify

### Quick Deploy

1. **Install Netlify CLI**:
```bash
npm install -g netlify-cli
```

2. **Build and deploy**:
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Continuous Deployment

1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Build environment variables**:
     ```
     NODE_OPTIONS=--max-old-space-size=1792
     ```

5. Add environment variables in Site Settings

6. Deploy

### Netlify Configuration File

Create `netlify.toml`:

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

## Option 3: AWS S3 + CloudFront

### Setup S3 Bucket

1. **Create S3 bucket**:
```bash
aws s3 mb s3://aurex-app
```

2. **Configure bucket for static website**:
```bash
aws s3 website s3://aurex-app --index-document index.html --error-document index.html
```

3. **Update bucket policy** (make public):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aurex-app/*"
    }
  ]
}
```

4. **Build and upload**:
```bash
npm run build
aws s3 sync dist/ s3://aurex-app --delete
```

### Setup CloudFront CDN

1. Create CloudFront distribution pointing to S3 bucket
2. Configure custom SSL certificate
3. Set up custom domain
4. Enable compression
5. Update DNS records

### Automated Deployment Script

Create `deploy-aws.sh`:

```bash
#!/bin/bash

echo "Building application..."
npm run build

echo "Uploading to S3..."
aws s3 sync dist/ s3://aurex-app --delete --cache-control "max-age=31536000,public"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

echo "Deployment complete!"
```

Make executable:
```bash
chmod +x deploy-aws.sh
```

---

## Option 4: Docker + VPS (DigitalOcean, Linode, etc.)

### Create Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Create nginx.conf

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Build and Deploy

1. **Build Docker image**:
```bash
docker build -t aurex-app .
```

2. **Run locally to test**:
```bash
docker run -p 8080:80 aurex-app
```

3. **Push to Docker Hub**:
```bash
docker tag aurex-app yourusername/aurex-app:latest
docker push yourusername/aurex-app:latest
```

4. **Deploy on VPS**:
```bash
# SSH into VPS
ssh root@your-vps-ip

# Pull and run
docker pull yourusername/aurex-app:latest
docker stop aurex-app || true
docker rm aurex-app || true
docker run -d --name aurex-app -p 80:80 --restart unless-stopped yourusername/aurex-app:latest
```

### Docker Compose (with Backend)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_BASE_URL=http://backend:3001

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=aurex_db
      - DB_USER=aurex
      - DB_PASSWORD=${DB_PASSWORD}

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=aurex_db
      - POSTGRES_USER=aurex
      - POSTGRES_PASSWORD=${DB_PASSWORD}

volumes:
  postgres_data:
```

Deploy:
```bash
docker-compose up -d
```

---

## Option 5: GitHub Pages (Free for Public Repos)

### Setup

1. **Install gh-pages**:
```bash
npm install --save-dev gh-pages
```

2. **Update package.json**:
```json
{
  "homepage": "https://yourusername.github.io/aurex",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. **Update vite.config.ts**:
```typescript
export default defineConfig({
  base: '/aurex/', // Your repo name
  // ... rest of config
});
```

4. **Deploy**:
```bash
npm run deploy
```

5. **Configure GitHub**:
   - Go to repo Settings → Pages
   - Source: `gh-pages` branch
   - Save

**Note**: GitHub Pages is best for static demos, not production apps with backend.

---

## Performance Optimization

### 1. Enable Compression

All platforms should use gzip/brotli compression. For nginx:

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

- **Cloudflare**: Free tier, easy DNS setup
- **AWS CloudFront**: Best performance, pay-as-you-go
- **Fastly**: Enterprise-grade

### 4. Optimize Build

Update `vite.config.ts`:

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
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (cron)
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Vercel/Netlify

SSL is automatic - just add your custom domain in dashboard.

---

## Environment Variables for Production

Create `.env.production`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-production-client-id
VITE_GOOGLE_REDIRECT_URI=https://yourdomain.com/oauth/callback
VITE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

---

## Monitoring & Analytics

### Add Error Tracking (Sentry)

```bash
npm install @sentry/react @sentry/vite-plugin
```

Update `src/main.tsx`:

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
// src/lib/analytics.ts
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

## Deployment Checklist

- [ ] Environment variables configured for production
- [ ] API endpoints point to production backend
- [ ] Mock data removed (see Step 1 guide)
- [ ] SSL/HTTPS enabled
- [ ] Custom domain configured
- [ ] Error tracking (Sentry) set up
- [ ] Analytics (Google Analytics) configured
- [ ] Performance optimization applied
- [ ] CDN configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up

---

**Next**: Proceed to **COMPLETE-DEPLOYMENT-GUIDE.md** for the unified step-by-step process
