"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";

interface ChatSidebarProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSidebar = ({ roomId, isOpen, onClose }: ChatSidebarProps) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<{ text: string; sender: string }[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: { text: string; sender: string }) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };

    socket.on("receive-message", handleMessage);
    socket.on("chat-message", handleMessage);

    return () => {
      socket.off("receive-message", handleMessage);
      socket.off("chat-message", handleMessage);
    };
  }, [socket]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    // Use a simplified sender for now
    socket.emit("send-message", { text: input, sender: "User" }, roomId);
    socket.emit("chat-message", { text: input, sender: "User", roomId: roomId }); 
    
    setInput("");
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 h-full w-full md:w-80 bg-[#1a1a24] border-l border-white/10 flex flex-col z-50 shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <h3 className="font-semibold text-white">Chat Room</h3>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition"><X className="w-5 h-5" /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
             <div className="text-center text-muted-foreground text-sm mt-10">No messages yet. Say hello!</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.sender === "User" ? "items-end" : "items-start"}`}>
             <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
               m.sender === "User" 
               ? "bg-primary text-white rounded-br-none" 
               : "bg-zinc-800 text-zinc-100 rounded-bl-none"
             }`}>
               {m.text}
             </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-black/20 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white"
        />
        <button type="submit" className="p-2 bg-primary rounded-full text-white hover:bg-primary/90 transition flex-shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
