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
        const ip = getIp(socket);
        
        // Initialize room map if needed
        if (!roomIPs.has(roomId)) {
           roomIPs.set(roomId, new Map());
        }
        
        const roomMap = roomIPs.get(roomId)!;
        const existingSocketId = roomMap.get(ip);

        // Check for duplicates
        if (existingSocketId && existingSocketId !== socket.id) {
             // Same IP, different socket. 
             // Logic: "Maintain or re-establish". a specific request "backend should not create a new user instance".
             // We interpret this as: Eliminate the duplicate (Ghost/Old Tab) and allow the Reconnect (New Tab/Refresh).
             // This ensures only 1 "screen" per IP active.
             
             // Check if old socket is actually alive
             const oldSocket = io.sockets.sockets.get(existingSocketId);
             if (oldSocket) {
                 // Disconnect the old "ghost" or previous tab
                 oldSocket.leave(roomId);
                 oldSocket.disconnect(true); 
                 // We don't return here; we proceed to let the NEW socket join.
             }
        }

        // Capacity Check (Unique IPs)
        // If this is a NEW IP (not currently in map), check size
        if (!roomMap.has(ip) || roomMap.get(ip) !== socket.id) {
            if (roomMap.size >= 4 && !roomMap.has(ip)) {
                 socket.emit("room-full");
                 return;
            }
        }
        
        // Register IP
        roomMap.set(ip, socket.id);

        socket.join(roomId);
        // Broadcast both userId and userName
        socket.broadcast.to(roomId).emit("user-connected", userId, userName);
        
        socket.on("disconnect", () => {
             // Cleanup
             const map = roomIPs.get(roomId);
             if (map && map.get(ip) === socket.id) {
                 map.delete(ip);
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
