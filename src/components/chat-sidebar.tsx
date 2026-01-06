"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";

interface ChatSidebarProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const ChatSidebar = ({ roomId, isOpen, onClose, userName }: ChatSidebarProps) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<{ text: string; senderId: string; senderName: string }[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: { text: string; senderId: string; senderName: string }) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };

    socket.on("receive-message", handleMessage);
    // Remove "chat-message" listener if it was redundant or ensure parity
    // Keeping logic simple: io.ts emits 'receive-message'

    return () => {
      socket.off("receive-message", handleMessage);
    };
  }, [socket]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    const msgData = { text: input, senderId: socket.id, senderName: userName };
    
    // Optimistic update
    // setMessages((prev) => [...prev, msgData]); // Actually better to wait for server echo to ensure order? 
    // Usually io.to(roomId) includes sender. So we don't optimistic update to avoid double.

    socket.emit("send-message", msgData, roomId);
    setInput("");
  };
  
  return (
    <div className={`fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:bottom-28 h-[45vh] md:w-80 md:h-[500px] bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col z-[50] shadow-2xl transition-all duration-300 origin-bottom-right ${isOpen ? "opacity-100 scale-100 pointer-events-auto translate-y-0" : "opacity-0 scale-95 pointer-events-none translate-y-4"}`}>
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
            <h3 className="font-bold text-sm text-white tracking-wide">Live Chat</h3>
        </div>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" ref={scrollRef}>
        {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2">
                 <div className="p-3 bg-white/5 rounded-full"><Send className="w-4 h-4 opacity-50"/></div>
                 <span className="text-xs">No messages yet</span>
             </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.senderId === socket?.id;
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
               {!isMe && <span className="text-[10px] text-white/50 ml-1 mb-0.5">{m.senderName}</span>}
               <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs md:text-sm break-words shadow-sm ${
                 isMe 
                 ? "bg-blue-600 text-white rounded-br-none" 
                 : "bg-white/10 text-white border border-white/5 rounded-bl-none"
               }`}>
                 {m.text}
               </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="p-2 border-t border-white/10 bg-white/5 rounded-b-2xl backdrop-blur-md flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-black/20 border border-white/10 rounded-full px-3 py-1.5 text-xs md:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition"
        />
        <button type="submit" className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!input.trim()}>
          <Send className="w-3 h-3 md:w-4 md:h-4" />
        </button>
      </form>
    </div>
  );
};
