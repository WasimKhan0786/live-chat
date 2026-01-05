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
        socket.join(roomId);
        // Broadcast both userId and userName
        socket.broadcast.to(roomId).emit("user-connected", userId, userName);
        
        socket.on("disconnect", () => {
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
