# Step-by-Step Deployment Guide

## Overview
- **Backend**: Deploy on Render.com (free tier supports WebSockets + persistent storage)
- **Frontend**: Deploy on Vercel.com (free static hosting)
- **ESP8266**: Update code with your backend URL

---

## PART 1: Deploy Backend on Render

### Step 1: Push Code to GitHub

1. **Create GitHub account** (if you don't have one): https://github.com
2. **Create a new repository**:
   - Click "New repository"
   - Name: `smart-greenhouse`
   - Make it **Public** (free Render tier requires public repos)
   - Click "Create repository"

3. **Push your code to GitHub**:
   ```bash
   # Open PowerShell in your project folder
   cd "C:\Users\jeeva\Desktop\Smart Green House"
   
   # Initialize git (if not already done)
   git init
   git add .
   git commit -m "Initial commit"
   
   # Connect to GitHub (replace YOUR_USERNAME)
   git remote add origin https://github.com/YOUR_USERNAME/smart-greenhouse.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Create Render Account

1. Go to https://render.com
2. Click **"Get Started"** (free)
3. Sign up with GitHub (easiest)

### Step 3: Deploy Backend on Render

1. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account if prompted
   - Select repository: `smart-greenhouse`

2. **Configure Settings**:
   - **Name**: `greenhouse-backend` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (uses project root)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js`
   - **Instance Type**: Free (512MB RAM)

3. **Add Environment Variables**:
   - Click "Advanced"
   - Add Environment Variable:
     - Key: `PORT`
     - Value: `10000` (Render will override this, but it's good to have)

4. **Add Persistent Disk** (IMPORTANT for SQLite):
   - Scroll to "Persistent Disk"
   - Click "Add Persistent Disk"
   - Name: `db-data`
   - Mount Path: `/opt/render/project/src/backend/data`
   - Size: 1 GB (free tier allows up to 1GB)

5. **Click "Create Web Service"**
   - Wait 3-5 minutes for deployment
   - Note your URL: `https://greenhouse-backend.onrender.com` (or similar)

### Step 4: Test Backend

1. Visit: `https://YOUR_BACKEND_URL.onrender.com/api/health`
2. Should see: `{"ok":true}`
3. ✅ Backend is live!

---

## PART 2: Update Frontend Config

### Step 1: Update config.js

1. Open `frontend/config.js`
2. Update the backend URL:
   ```javascript
   window.BACKEND_URL = "https://YOUR_BACKEND_URL.onrender.com";
   ```
   (Replace `YOUR_BACKEND_URL` with your actual Render URL)

3. Save the file

### Step 2: Commit Changes

```bash
git add frontend/config.js
git commit -m "Update backend URL for production"
git push
```

---

## PART 3: Deploy Frontend on Vercel

### Step 1: Create Vercel Account

1. Go to https://vercel.com
2. Click "Sign Up" (free)
3. Sign up with GitHub (easiest)

### Step 2: Import Project

1. **New Project**:
   - Click "Add New..." → "Project"
   - Import Git Repository
   - Select: `smart-greenhouse`

2. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: Leave empty (or select root if needed)
   - **Build Command**: Leave empty (static files, no build needed)
   - **Output Directory**: Leave empty
   - **Install Command**: Leave empty (Vercel will detect package.json)

3. **Environment Variables**:
   - Not needed for frontend (it uses config.js)

4. **Click "Deploy"**
   - Wait 1-2 minutes
   - You'll get a URL: `https://smart-greenhouse-xxxxx.vercel.app`

### Step 3: Test Frontend

1. Visit your Vercel URL
2. Dashboard should load
3. Open browser console (F12) → Check for errors
4. ✅ Frontend is live!

---

## PART 4: Update ESP8266 Code

### Step 1: Update Arduino Sketch

1. Open your Arduino code
2. Update these lines:
   ```cpp
   #define SERVER_BASE_URL "https://YOUR_BACKEND_URL.onrender.com"
   ```
   (Use your Render backend URL, **NOT** Vercel URL)

3. **Important**: For HTTPS on ESP8266, you may need to add certificate validation. Use this snippet:
   ```cpp
   #include <WiFiClientSecure.h>
   
   // Add this after WiFi.begin()
   WiFiClientSecure client;
   client.setInsecure(); // For testing only - accepts any certificate
   ```

4. **Update HTTP calls**:
   ```cpp
   HTTPClient http;
   http.begin(client, url); // Use WiFiClientSecure instead of WiFiClient
   ```

### Step 2: Full ESP8266 HTTPS Example

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

#define WIFI_SSID "YOUR_WIFI"
#define WIFI_PASS "YOUR_PASSWORD"
#define SERVER_BASE_URL "https://greenhouse-backend.onrender.com"

WiFiClientSecure client;

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  
  client.setInsecure(); // Accepts any certificate (for testing)
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(client, String(SERVER_BASE_URL) + "/api/sensors/ingest");
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<256> doc;
    doc["temperature"] = 26.5;
    doc["humidity"] = 55.2;
    // ... add other sensors
    
    String body;
    serializeJson(doc, body);
    int code = http.POST(body);
    http.end();
  }
  delay(5000);
}
```

---

## PART 5: Troubleshooting

### Backend Issues

**Problem**: Database not persisting
- **Solution**: Check persistent disk is mounted correctly at `/opt/render/project/src/backend/data`

**Problem**: WebSocket connection fails
- **Solution**: Render free tier supports WebSockets. Ensure Socket.IO is configured with CORS.

**Problem**: Service goes to sleep (free tier)
- **Solution**: Free tier sleeps after 15 min inactivity. First request after sleep takes ~30s. Upgrade to paid plan to avoid sleep, or use a cron job to ping your service.

### Frontend Issues

**Problem**: Can't connect to backend
- **Solution**: 
  1. Check `frontend/config.js` has correct backend URL
  2. Check browser console (F12) for CORS errors
  3. Ensure backend CORS allows your Vercel domain

**Problem**: Socket.IO not connecting
- **Solution**: Check backend URL in config.js, and ensure backend is running

### ESP8266 Issues

**Problem**: HTTPS connection fails
- **Solution**: Use `WiFiClientSecure` with `setInsecure()` for testing. For production, add proper certificate validation.

**Problem**: Connection timeout
- **Solution**: Ensure backend URL is correct, and service is awake (ping it first)

---

## Quick Reference

- **Backend URL**: `https://greenhouse-backend.onrender.com` (your Render URL)
- **Frontend URL**: `https://smart-greenhouse-xxxxx.vercel.app` (your Vercel URL)
- **Health Check**: `https://YOUR_BACKEND/api/health`
- **API Docs**: 
  - POST `/api/sensors/ingest` - ESP8266 sends data here
  - GET `/api/actuators` - Get device states
  - POST `/api/actuators/:id/toggle` - Toggle device

---

## Cost

- **Render**: Free tier (512MB RAM, spins down after 15 min)
- **Vercel**: Free tier (unlimited static hosting)
- **Total**: $0/month 🎉

---

## Next Steps

1. ✅ Deploy backend on Render
2. ✅ Deploy frontend on Vercel
3. ✅ Update ESP8266 code with backend URL
4. ✅ Test end-to-end
5. 🎉 Your Smart Greenhouse is live!

---

## Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Check Render logs: Dashboard → Your Service → Logs
3. Check Vercel logs: Dashboard → Your Project → Deployments → Logs

