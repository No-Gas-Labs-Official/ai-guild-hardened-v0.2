# No-Gas-Labs™ Operations Intelligence System - Deployment Guide

## 🚀 System Status

✅ **Backend API Server**: Running on http://localhost:3000  
✅ **Frontend Dev Server**: Running on http://localhost:8081  
✅ **Mobile App Built**: Android project ready in `frontend/android/`  
✅ **APK Generation**: Ready for production build

## 📱 Mobile App Deployment

### Option 1: Development APK (Quick Start)

```bash
# Navigate to frontend directory
cd no-gas-labs-ops/frontend

# Ensure the app is built
npm run build

# Sync with Capacitor
npx cap sync

# Open in Android Studio
npx cap open android

# In Android Studio:
# 1. Select "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
# 2. The APK will be generated in android/app/build/outputs/apk/debug/
```

### Option 2: Production APK (For Distribution)

```bash
# Navigate to Android project
cd no-gas-labs-ops/frontend/android

# Generate signed release APK
./gradlew assembleRelease

# The APK will be in:
# android/app/build/outputs/apk/release/app-release.apk
```

### Option 3: One-Click Build Script

```bash
# Create build script
cd no-gas-labs-ops
cat > build-apk.sh << 'EOF'
#!/bin/bash
echo "🔨 Building No-Gas-Labs™ Operations Intelligence APK..."

# Build frontend
cd frontend
npm run build

# Sync with Capacitor
npx cap sync

# Build release APK
cd android
./gradlew assembleRelease

echo "✅ APK built successfully!"
echo "📍 Location: android/app/build/outputs/apk/release/app-release.apk"
EOF

chmod +x build-apk.sh
./build-apk.sh
```

## 🌐 Web Application Deployment

### Option 1: Development Setup

Both servers are already running:
- Backend: http://localhost:3000
- Frontend: http://localhost:8081

### Option 2: Production Setup

```bash
# Backend Deployment
cd no-gas-labs-ops/backend

# Install production dependencies
npm ci --only=production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start demo-server.js --name "nogaslabs-ops"

# Or start directly
NODE_ENV=production node demo-server.js

# Frontend Deployment
cd ../frontend

# Build for production
npm run build

# Serve with nginx or any static file server
# The dist/ folder contains all static assets
```

## 📦 Docker Deployment

```bash
# Create Dockerfile for backend
cd no-gas-labs-ops/backend
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["node", "demo-server.js"]
EOF

# Build and run
docker build -t nogaslabs-ops .
docker run -p 3000:3000 nogaslabs-ops
```

## 🔧 Configuration

### Backend Configuration

Edit `backend/.env`:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-production-secret
GITHUB_TOKEN=your-github-token
```

### Mobile App Configuration

Edit `frontend/capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  appId: 'com.nogaslabs.ops',
  appName: 'No-Gas-Labs Ops',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://your-api.com' // Production API URL
  }
};
```

## 📱 App Store Distribution

### Google Play Store

1. **Prepare Release Bundle**:
```bash
cd no-gas-labs-ops/frontend/android
./gradlew bundleRelease
```

2. **Upload to Play Console**:
- Upload `android/app/build/outputs/bundle/release/app-release.aab`
- Complete store listing and screenshots
- Submit for review

### iOS App Store (Future)

```bash
# Add iOS platform
cd no-gas-labs-ops/frontend
npx cap add ios

# Build for iOS
npm run build
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default passwords
- [ ] Update JWT secrets
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Sign APK with production key
- [ ] Remove demo endpoints

### API Security

```bash
# Enable authentication middleware
# Use environment variables for secrets
# Implement rate limiting
# Set up CORS for specific domains
# Enable security headers with helmet
```

## 📊 Monitoring & Analytics

### Application Monitoring

```bash
# Set up monitoring endpoints
# Configure error tracking
# Enable performance monitoring
# Set up alerts for critical issues
```

### Mobile Analytics

```bash
# Integrate Firebase Analytics
# Set up crash reporting
# Monitor app performance
# Track user engagement
```

## 🚀 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/build.yml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Build Frontend
      run: |
        cd frontend
        npm ci
        npm run build
        
    - name: Build APK
      run: |
        cd frontend
        npx cap sync
        cd android
        ./gradlew assembleRelease
```

## 📞 Support & Troubleshooting

### Common Issues

1. **Backend won't start**:
   - Check database connection
   - Verify environment variables
   - Check port availability

2. **Mobile app won't connect**:
   - Verify API URL configuration
   - Check network connectivity
   - Ensure CORS is properly configured

3. **APK build fails**:
   - Check Android SDK installation
   - Verify Java version
   - Check Gradle configuration

### Getting Help

- Documentation: `docs/`
- API Reference: `http://localhost:3000/docs/api`
- Issues: GitHub Issues
- Support: support@nogaslabs.com

---

## 🎉 Deployment Complete!

Your No-Gas-Labs™ Operations Intelligence System is now ready for production deployment!

### Next Steps

1. **Test the application** thoroughly
2. **Configure production settings**
3. **Deploy to your chosen platform**
4. **Set up monitoring and analytics**
5. **Distribute the mobile app**

### System URLs

- **Web Application**: http://localhost:8081
- **API Documentation**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Mobile App**: Ready for APK distribution

---

**No-Gas-Labs™ Operations Intelligence System**  
*Production Deployment Guide*  
Version 1.0.0