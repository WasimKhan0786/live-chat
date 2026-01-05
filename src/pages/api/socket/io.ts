import { Server as NetServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIo = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

const roomIPs = new Map<string, Map<string, string>>(); // roomId -> IP -> socketId

// Helper to get IP
const getIp = (socket: any) => {
  return socket.handshake.address || socket.handshake.headers['x-forwarded-for'] || 'unknown';
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
  if (!res.socket.server.io) {
    const path = "/api/socket/io";
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: path,
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("join-room", (roomId, userId, userName) => {
        // Initialize room map if needed
        if (!roomIPs.has(roomId)) {
           roomIPs.set(roomId, new Map());
        }
        
        const roomMap = roomIPs.get(roomId)!;

        // Capacity Check (Max 4 Participants)
        if (roomMap.size >= 4 && !roomMap.has(socket.id)) {
             socket.emit("room-full");
             return;
        }
        
        // Register Socket
        // We use socket.id as the key now, effectively allowing multiple tabs/devices per IP
        // Use a dummy 'ip' key or just change the Map structure? 
        // To minimize refactor, we can just treat the 'inner map' as SocketID -> SocketID or similar.
        // Actually, let's just use the socket ID as the key in the roomMap.
        roomMap.set(socket.id, socket.id);

        socket.join(roomId);
        // Broadcast both userId and userName
        socket.broadcast.to(roomId).emit("user-connected", userId, userName);
        
        socket.on("disconnect", () => {
             // Cleanup
             const map = roomIPs.get(roomId);
             if (map) {
                 map.delete(socket.id);
                 if(map.size === 0) roomIPs.delete(roomId);
             }
             socket.broadcast.to(roomId).emit("user-disconnected", userId);
        });
      });

      // Chat Messages
      socket.on("send-message", (message, roomId) => {
        io.to(roomId).emit("receive-message", message);
      });

      // Video Controls (Watch Party)
      socket.on("video-action", (action, roomId) => {
        socket.broadcast.to(roomId).emit("video-action", action);
      });
      
      socket.on("watch-mode-update", (url, roomId) => {
         socket.broadcast.to(roomId).emit("watch-mode-update", url);
      });

      // Mini Browser (Google) Sync
      socket.on("browser-update", (url, roomId) => {
          socket.broadcast.to(roomId).emit("browser-update", url);
      });

      // WebRTC Signaling
      socket.on("signal", (data) => {
        // data: { signal: any, to: string, from: string }
        // data: { signal: any, to: string, from: string, userName?: string }
        io.to(data.to).emit("signal", { signal: data.signal, from: data.from, userName: data.userName });
      });
    });
  }
  res.end();
};

export default ioHandler;
