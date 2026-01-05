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
    if (!userName.trim()) {
      alert("Please enter your name first!");
      return;
    }
    
    // Generate simple ID (6 chars)
    const id = Math.random().toString(36).substring(2, 8);
    
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, action: 'create', user: userName })
      });
    } catch (error) {
       console.error("Notify error", error);
    }
    
    // Pass name in query param
    router.push(`/room/${id}?name=${encodeURIComponent(userName)}`);
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
        if (!userName.trim()) {
            alert("Please enter your name first!");
            return;
        }

        // Extract Room ID if User pastes full URL
        let idToJoin = roomId.trim();
        if(idToJoin.includes("/room/")) {
            const parts = idToJoin.split("/room/");
            if(parts[1]) {
                idToJoin = parts[1].split("?")[0]; // Remove query params if any
            }
        }

        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: idToJoin, action: 'join', user: userName })
          });
        } catch (error) {
           console.error("Notify error", error);
        }
      router.push(`/room/${idToJoin}?name=${encodeURIComponent(userName)}`);
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

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
         {/* Combined Card for better UX */}
         <div className="md:col-span-2 p-8 rounded-3xl bg-card/50 border border-white/5 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 text-center">
             <h2 className="text-2xl font-semibold flex items-center gap-2">
                 <Users className="w-6 h-6 text-primary" /> Get Started
             </h2>
             
             {/* Name Input - Required for both */}
             <div className="w-full max-w-md">
                 <label className="block text-left text-sm text-muted-foreground mb-2 ml-1">Your Name</label>
                 <input
                   type="text"
                   placeholder="Enter your name..."
                   className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg placeholder:text-muted-foreground/50 transition-all shadow-inner"
                   value={userName}
                   onChange={(e) => setUserName(e.target.value)}
                 />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                 {/* Create Action */}
                 <button 
                    onClick={createRoom}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all hover:scale-[1.02] cursor-pointer group"
                 >
                     <div className="p-3 rounded-full bg-primary/20 group-hover:bg-primary/30 text-primary transition-colors">
                        <Video className="w-6 h-6"/>
                     </div>
                     <span className="font-medium">Create New Room</span>
                 </button>

                 {/* Join Action */}
                 <div className="flex flex-col gap-3">
                     <input
                       type="text"
                       placeholder="Enter Room ID to Join"
                       value={roomId}
                       onChange={(e) => setRoomId(e.target.value)}
                       className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm placeholder:text-muted-foreground/50 transition-all text-center"
                     />
                     <button 
                       onClick={joinRoom}
                       disabled={!roomId}
                       className="w-full bg-secondary hover:bg-secondary/80 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Join Room
                     </button>
                 </div>
             </div>
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

      
      <div className="absolute bottom-4 text-center text-xs font-mono animate-pulse">
         <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 font-bold">
            Developed by Wasim Khan • Siwan, Bihar
         </span>
      </div>
    </div>
  );
}
