"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Video, Users, Monitor, Play } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const createRoom = async () => {
    const id = uuidv4();
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, action: 'create', user: userName || 'Anonymous' })
      });
    } catch (error) {
       console.error("Notify error", error);
    }
    router.push(`/room/${id}`);
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: roomId, action: 'join', user: userName || 'Anonymous' })
          });
        } catch (error) {
           console.error("Notify error", error);
        }
      router.push(`/room/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 gap-8 md:gap-12 bg-[#050505] relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-indigo-500 animate-text-shimmer bg-[size:200%_auto]">
          Connect. Share. Watch.
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
          The ultimate real-time communication platform for calls, screen sharing, and watch parties.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
         {/* Join Room Card */}
         <div className="p-6 rounded-3xl bg-card/50 border border-white/5 backdrop-blur-xl shadow-2xl hover:border-primary/50 transition-all duration-300 group">
             <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 group-hover:text-primary transition-colors">
               <Users className="w-6 h-6" /> Join a Room
             </h2>
             <form onSubmit={joinRoom} className="space-y-4">
               <div>
                 <input
                   type="text"
                   placeholder="Your Name (Optional)"
                   className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-base md:text-lg placeholder:text-muted-foreground/50 transition-all shadow-inner"
                   onChange={(e) => setUserName(e.target.value)}
                 />
                 <input
                   type="text"
                   placeholder="Enter Room ID"
                   value={roomId}
                   onChange={(e) => setRoomId(e.target.value)}
                   className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-base md:text-lg placeholder:text-muted-foreground/50 transition-all shadow-inner"
                 />
               </div>
               <button 
                 type="submit"
                 disabled={!roomId}
                 className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]"
               >
                 Join Room
               </button>
             </form>
         </div>

         {/* Create Room Card */}
         <div className="p-6 rounded-3xl bg-card/50 border border-white/5 backdrop-blur-xl shadow-2xl hover:border-primary/50 transition-all duration-300 group flex flex-col justify-between">
             <div>
               <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 group-hover:text-primary transition-colors">
                 <Video className="w-6 h-6" /> Create New Room
               </h2>
               <p className="text-muted-foreground mb-6">
                 Start a new session. You can invite friends, share your screen, or start a watch party.
               </p>
             </div>
             <button 
                onClick={createRoom}
                className="w-full bg-secondary hover:bg-secondary/80 text-white border border-white/10 font-medium py-3 rounded-xl transition-all hover:scale-[1.02]"
             >
                Create Instant Meeting
             </button>
         </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-12 w-full max-w-4xl mt-4 md:mt-8">
        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-default">
           <div className="p-3 rounded-full bg-white/5 text-primary"><Video className="w-5 h-5"/></div>
           <p>HD Video Calling</p>
        </div>
        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-default">
           <div className="p-3 rounded-full bg-white/5 text-purple-400"><Monitor className="w-5 h-5"/></div>
           <p>Screen Sharing</p>
        </div>
        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-default">
           <div className="p-3 rounded-full bg-white/5 text-indigo-400"><Play className="w-5 h-5"/></div>
           <p>Sync Watch Party</p>
        </div>
      </div>

      
      <div className="absolute bottom-4 text-center text-xs text-muted-foreground/40 font-mono">
         Developed by Wasim Khan • Siwan, Bihar
      </div>
    </div>
  );
}
