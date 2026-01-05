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
    
    // Generate simple ID (6 chars) - Uppercase for "Code" look
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    
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
    <div className="min-h-screen w-full bg-[#030305] text-white flex flex-col relative overflow-hidden font-sans selection:bg-purple-500/30">
        
      {/* --- Dynamic Background --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Animated Gradient Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-600/20 rounded-full blur-[128px] animate-pulse delay-1000" />
          <div className="absolute top-[20%] left-[30%] w-[20rem] h-[20rem] bg-pink-500/10 rounded-full blur-[96px] animate-ping duration-[5000ms]" />
          
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 mix-blend-overlay" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_40%,transparent_100%)]" />
      </div>

      {/* --- Navbar area (Logo) --- */}
      <div className="absolute top-0 left-0 p-6 md:p-10 z-20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="p-2 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-md shadow-lg">
             <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white/90">Connect<span className="text-primary">Live</span></span>
      </div>

      {/* --- Error Toast --- */}
      {errorMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md text-red-200 px-6 py-3 rounded-full shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-sm">{errorMsg}</span>
            </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 gap-16 md:gap-20 mt-10 md:mt-0">
          
          {/* Hero Section */}
          <div className="text-center space-y-6 max-w-4xl pt-10 md:pt-0">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 animate-in fade-in zoom-in duration-700">
                 <Sparkles className="w-3 h-3 text-yellow-400" /> 
                 <span>Experience the future of connection</span>
             </div>

             <h1 className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-5 text-6xl md:text-8xl font-black tracking-tighter leading-none">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards drop-shadow-2xl">
                    Connect.
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-pink-500 to-rose-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-forwards drop-shadow-2xl">
                    Share.
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-forwards drop-shadow-2xl">
                    Watch.
                </span>
             </h1>

             <p className="text-muted-foreground text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed font-light tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                The ultimate real-time communication platform for calls, screen sharing, and watch parties.
             </p>
          </div>

          {/* Interaction Card */}
          <div className="w-full max-w-lg md:max-w-5xl md:h-[420px] relative group animate-in fade-in zoom-in-95 duration-1000 delay-700">
             {/* Glow effect behind card */}
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000" />
             
             <div className="relative w-full h-full bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center justify-between">
                
                {/* Left Side: Getting Started */}
                <div className="flex-1 w-full flex flex-col gap-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Get Started</h2>
                        <p className="text-white/40">Enter your details to create or join a room.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs uppercase tracking-wider font-semibold text-white/50 ml-1">Your Name</label>
                            <input
                                type="text"
                                placeholder="ex. John Doe"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder:text-white/20 transition-all hover:bg-white/10"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <button 
                        onClick={createRoom}
                        className="group/btn relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 p-[1px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                        <div className="relative h-full w-full bg-black/10 group-hover/btn:bg-transparent transition-colors rounded-[11px] px-8 py-4 flex items-center justify-center gap-3">
                            <div className="p-1 rounded-full bg-white/20"><Sparkles className="w-4 h-4 text-white" /></div>
                            <span className="font-semibold text-lg">Create New Room</span>
                        </div>
                    </button>
                    
                </div>

                {/* Divider (Desktop) */}
                <div className="hidden md:flex h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                {/* Divider (Mobile) */}
                <div className="md:hidden w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Right Side: Join Room */}
                <div className="flex-1 w-full flex flex-col gap-6 justify-center">
                    <div className="space-y-2">
                         <h2 className="text-2xl font-semibold text-white/80">Have a code?</h2>
                         <p className="text-white/40 text-sm">Paste your room ID below to join.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-2">
                           <input
                                type="text"
                                placeholder="Enter Room ID"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white placeholder:text-white/20 transition-all text-center tracking-widest font-mono uppercase"
                            />
                        </div>
                         <button 
                             onClick={joinRoom}
                             disabled={!roomId}
                             className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group/join"
                         >
                             <span>Join Room</span>
                             <Share2 className="w-4 h-4 group-hover/join:translate-x-1 transition-transform" />
                         </button>
                    </div>

                    {/* Features Mini-Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                            <Video className="w-5 h-5 text-blue-400" />
                            <span className="text-[10px] text-white/50">HD Video</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                            <Monitor className="w-5 h-5 text-purple-400" />
                            <span className="text-[10px] text-white/50">Sharing</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                            <Tv className="w-5 h-5 text-pink-400" />
                            <span className="text-[10px] text-white/50">Party</span>
                        </div>
                    </div>
                </div>

             </div>
          </div>

      </main>

      {/* --- Footer --- */}
      <footer className="w-full p-6 text-center relative z-10 hidden md:block">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition cursor-default">
             <span className="text-white/30 text-xs font-medium uppercase tracking-widest">Designed & Developed by</span>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 font-bold text-sm">
                 Wasim Khan
             </span>
             <span className="w-1 h-1 rounded-full bg-white/30" />
             <span className="text-white/50 text-xs">Siwan, Bihar</span>
          </div>
      </footer>
      
      {/* Mobile Footer Fix */}
      <footer className="w-full p-6 text-center relative z-10 md:hidden pb-10">
          <div className="flex flex-col items-center gap-1 opacity-60">
             <span className="text-xs text-white/50">Designed by</span>
             <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Wasim Khan</span>
          </div>
      </footer>

    </div>
  );
}
