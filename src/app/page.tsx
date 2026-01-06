"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { v4 as uuidv4 } from "uuid"; // Not used anymore
import { Video, Users, Monitor, Play, AlertCircle, Sparkles, Tv, Share2, Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [errorMsg, setErrorMsg] = useState(""); // Custom error state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showError = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 3000);
  };

  const createRoom = async () => {
    if (!userName.trim()) {
      showError("Please enter your name first! 👤");
      return;
    }

    // Default to Guest if no name
    const finalName = userName.trim();
    
    // Generate secure UUID for the room
    const id = crypto.randomUUID();
    
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, action: 'create', user: finalName })
      });
    } catch (error) {
       console.error("Notify error", error);
    }
    
    // Pass name in query param
    router.push(`/room/${id}?name=${encodeURIComponent(finalName)}&action=create`);
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
        if (!userName.trim()) {
            showError("Please enter your name first! 👤");
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
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col relative overflow-hidden font-sans selection:bg-purple-500/30">
        
      {/* --- Dynamic Background --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-700" />
          <div className="absolute -bottom-[10%] left-[20%] w-[30vw] h-[30vw] bg-pink-500/10 rounded-full blur-[80px] animate-ping duration-[8000ms]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-125 contrast-125 mix-blend-overlay" />
      </div>

      {/* --- Navbar --- */}
      <nav className="absolute top-0 left-0 w-full p-6 md:p-8 z-30 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl shadow-purple-500/5">
                 <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white/90">Connect<span className="text-primary">Live</span></span>
           </div>
      </nav>

      {/* --- Error Toast --- */}
      {errorMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] max-w-sm">
            <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl text-red-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-medium text-sm">{errorMsg}</span>
            </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
          
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              
              {/* Left Column: Text & Hero */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 pt-20 lg:pt-0">
                   
                   <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70 animate-in fade-in zoom-in duration-700">
                       <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                       <span>Live & Secure Communication</span>
                   </div>

                   <div className="space-y-2">
                       <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
                            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 pb-2">Connect.</span>
                            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 pb-2">Share.</span>
                            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500">Watch.</span>
                       </h1>
                       <p className="text-lg md:text-xl text-white/50 max-w-lg font-light leading-relaxed pt-4">
                           Experience the future of connection. Instant video calls, seamless screensharing, and synchronized watch parties in one secure link.
                       </p>
                   </div>
              </div>

              {/* Right Column: Dynamic Interaction Card */}
              <div className="w-full flex justify-center lg:justify-end animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                   <div className="relative w-full max-w-md group">
                        {/* Card Glow */}
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000" />
                        
                        <div className="relative w-full bg-[#0c0c0f]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 md:p-10 flex flex-col gap-8 shadow-2xl">
                            
                            <div className="space-y-1 text-center">
                                <h2 className="text-2xl font-bold text-white">Start Instant Meeting</h2>
                                <p className="text-white/40 text-sm">Create a secure room in seconds</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-1">Display Name</label>
                                    <input
                                        type="text"
                                        placeholder="Type your name..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all text-center text-lg font-medium"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                                    />
                                </div>

                                <button 
                                    onClick={createRoom}
                                    className="relative w-full overflow-hidden rounded-2xl bg-white text-black p-4 font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 shadow-xl shadow-white/10 group/btn"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        Create New Room
                                    </span>
                                </button>
                            </div>

                            {/* Feature Pills */}
                            <div className="pt-4 grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Video className="w-4 h-4" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white/90">HD Video</span>
                                        <span className="text-[10px] text-white/40">Crystal clear</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400"><Monitor className="w-4 h-4" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white/90">Sharing</span>
                                        <span className="text-[10px] text-white/40">Screen & Tabs</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400"><Tv className="w-4 h-4" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white/90">Watch Party</span>
                                        <span className="text-[10px] text-white/40">Sync YouTube</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-lg bg-green-500/20 text-green-400"><Users className="w-4 h-4" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white/90">Wait Room</span>
                                        <span className="text-[10px] text-white/40">Host Control</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                   </div>
              </div>
          </div>
      </main>

      {/* --- Footer --- */}
      <footer className="w-full pb-8 pt-4 px-6 relative z-10">
          <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
               <div className="text-xs text-white/30 font-medium">
                   &copy; 2026 ConnectLive. Secure & Encrypted.
               </div>

               <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition cursor-default">
                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Created By</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold text-xs">
                        Wasim Khan
                    </span>
                    <div className="w-px h-3 bg-white/10 mx-1" />
                    <span className="text-white/40 text-[10px]">Siwan, Bihar</span>
               </div>
          </div>
      </footer>
    </div>
  );
}
