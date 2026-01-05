# Live Chat & Watch Party App

A real-time communication platform built with Next.js, Socket.io, WebRTC (Simple Peer), and MongoDB.

## Features

- **Real-time Video/Audio Calls**: Mesh network using WebRTC.
- **Watch Party**: Synchronized video playback.
- **Chat**: Real-time messaging in room.
- **Room Management**: Create and join rooms via ID.
- **Responsive Premium Design**: Glassmorphism and animations.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Environment Variables:
   Create `.env.local` with:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Run Development Server:
   ```bash
   npm run dev
   ```

## Deployment on Vercel

1. Push to GitHub.
2. Import project in Vercel.
3. Add Environment Variables in Vercel.
4. **Important**: This app uses a custom Socket.io server integrated into Next.js API Routes. On Vercel (Serverless), WebSocket connections may be unstable or limited by function execution time. For a production-grade app, consider deploying the request handler to a VPS or using a dedicated WebSocket provider.

## Technologies

- **Next.js 15** (App Router)
- **Socket.io** (Real-time events)
- **Simple Peer** (WebRTC Video/Audio)
- **Tailwind CSS** (Styling)
- **MongoDB** (Database - _Optional integration prepared in lib/db.ts_)
- **Lucide React** (Icons)

## Developer

**Developed by Wasim Khan**  
📍 Siwan, Bihar  
🚀 Built with passion for real-time web technologies.
