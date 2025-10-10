# Auction App Deployment Guide

## 🚀 Quick Deploy with Vercel + Railway

### Frontend (Vercel)
1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-railway-app.railway.app
   ```

### Backend (Railway)
1. Connect GitHub repo to Railway
2. Set environment variables:
   ```
   MONGODB_URI=mongodb+srv://clee1243:Sunningdale12!@auction.tpbymme.mongodb.net/player-trading-app
   JWT_SECRET=your-jwt-secret-key
   PORT=8000
   NODE_ENV=production
   ```

## 📱 Mobile Access
Once deployed, coaches can access via:
- https://your-app.vercel.app
- Works on any mobile browser
- Add to home screen for app-like experience

## Alternative: DigitalOcean VPS ($6/month)
See DEPLOYMENT-VPS.md for VPS setup

## Alternative: Docker + Any Cloud
See docker-compose.yml for containerized deployment
