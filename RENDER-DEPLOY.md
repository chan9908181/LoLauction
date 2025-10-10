# 🚀 Render Deployment Guide

## ✅ Your App is Ready to Deploy!

### Quick Deploy Steps:

#### 1. Deploy Backend First
1. Go to [Render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repo: `chan9908181/LoLauction`
4. Configure:
   ```
   Name: auction-backend
   Environment: Node
   Build Command: cd server && npm install
   Start Command: cd server && npm start
   ```
5. Add Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://clee1243:Sunningdale12!@auction.tpbymme.mongodb.net/player-trading-app
   JWT_SECRET=7kN9$mL2@vB5*qR8#wE4!xC7&zA0^uI3%oP6+tY1-fG8~hJ5+mX2&nQ9*rT4@wE7!
   NODE_ENV=production
   ```
6. Deploy! (takes ~2-3 minutes)
7. **Copy the backend URL** (e.g., `https://auction-backend-xyz.onrender.com`)

#### 2. Deploy Frontend
1. Click "New" → "Web Service" again
2. Same GitHub repo: `chan9908181/LoLauction`
3. Configure:
   ```
   Name: auction-frontend
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   NEXT_PUBLIC_WS_URL=wss://your-backend-url.onrender.com
   ```
5. Deploy!

#### 3. Share with Coaches
- Frontend URL: `https://auction-frontend-xyz.onrender.com`
- Coaches can access on phones/tablets
- Works in any mobile browser

## 💰 Cost
- **Free Plan**: Both services on free tier
- **Limitation**: Services sleep after 15 minutes of inactivity
- **Paid**: $7/month per service for always-on

## 🔧 Alternative: Manual Setup
If render.yaml doesn't work, follow the manual steps above.

## 🐛 Troubleshooting
- If WebSocket fails, check WSS (secure WebSocket) URLs
- Free tier services take ~30 seconds to wake up
- Check Render logs for any deployment errors

Your app is 100% ready for Render deployment! 🎯
