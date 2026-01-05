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
  
  // if (!isOpen) return null; // REMOVED: Keep component mounted to listen for messages

  return (
    <div className={`fixed inset-y-0 right-0 h-full w-full md:w-80 bg-[#1a1a24] border-l border-white/10 flex flex-col z-[60] shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <h3 className="font-semibold text-white">Chat Room</h3>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition"><X className="w-5 h-5 text-white" /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
             <div className="text-center text-muted-foreground text-sm mt-10">No messages yet. Say hello!</div>
        )}
        {messages.map((m, i) => {
          const isMe = m.senderId === socket?.id;
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
               {!isMe && <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">{m.senderName}</span>}
               <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm break-words ${
                 isMe 
                 ? "bg-primary text-white rounded-br-none" 
                 : "bg-[#27272a] text-white rounded-bl-none"
               }`}>
                 {m.text}
               </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-black/20 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder:text-muted-foreground"
        />
        <button type="submit" className="p-2 bg-primary rounded-full text-white hover:bg-primary/90 transition flex-shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
