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

const roomIPs = new Map<string, Map<string, string>>(); // roomId -> SocketID -> SocketID (Keep for capacity count)
const roomSessions = new Map<string, Map<string, string>>(); // roomId -> SessionID -> SocketID

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

      socket.on("join-room", (roomId, userId, userName, sessionId) => {
        // userId is actually socket.id here from client

        // 1. Session Management (Fix Refresh Duplicates)
        if (!roomSessions.has(roomId)) {
            roomSessions.set(roomId, new Map());
        }
        const sessions = roomSessions.get(roomId)!;

        if (sessionId) {
            if (sessions.has(sessionId)) {
                const oldSocketId = sessions.get(sessionId);
                if (oldSocketId && oldSocketId !== socket.id) {
                    // This is a REFRESH or Reconnect from same browser session
                    console.log(`Session ${sessionId} refreshed. Removing ghost ${oldSocketId}`);
                    
                    // Forcefully tell everyone the old user is gone
                    socket.broadcast.to(roomId).emit("user-disconnected", oldSocketId); 
                    
                    // Disconnect the ghost socket if it's still hanging around
                    const oldSocket = io.sockets.sockets.get(oldSocketId);
                    if (oldSocket) {
                        oldSocket.leave(roomId);
                        oldSocket.disconnect(true);
                    }
                    
                    // Also remove from roomIPs map to fix capacity count
                    if(roomIPs.has(roomId)) {
                        roomIPs.get(roomId)?.delete(oldSocketId);
                    }
                }
            }
            // Update session to new socket
            sessions.set(sessionId, socket.id);
        }

        // 2. Room Capacity Management
        if (!roomIPs.has(roomId)) {
           roomIPs.set(roomId, new Map());
        }
        
        const roomMap = roomIPs.get(roomId)!;

        // Capacity Check (Max 10 Participants)
        // Note: usage of roomMap here is just to count active sockets
        if (roomMap.size >= 10 && !roomMap.has(socket.id)) {
             socket.emit("room-full");
             return;
        }
        
        roomMap.set(socket.id, socket.id);

        socket.join(roomId);
        // Broadcast both userId and userName
        socket.broadcast.to(roomId).emit("user-connected", userId, userName);
        
        socket.on("disconnect", () => {
             // Cleanup Maps
             const map = roomIPs.get(roomId);
             if (map) {
                 map.delete(socket.id);
                 if(map.size === 0) roomIPs.delete(roomId);
             }
             
             // Cleanup Session
             if (sessionId && sessions.get(sessionId) === socket.id) {
                 sessions.delete(sessionId);
                 if (sessions.size === 0) roomSessions.delete(roomId);
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
