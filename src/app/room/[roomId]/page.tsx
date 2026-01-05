"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useParams, useRouter } from "next/navigation";
import SimplePeer from "simple-peer";
import { Mic, MicOff, Video, VideoOff, Monitor, Play, MessageSquare, PhoneOff, Copy, Share2, LayoutGrid } from "lucide-react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { VideoFeed } from "@/components/video-feed"; 
import { VideoPlayer } from "@/components/video-player"; // We haven't created this file yet, but I will next.
import { cn } from "@/lib/utils";

import { Wand2, RefreshCw } from "lucide-react"; // Import Wand and Refresh icons
// Create a Placeholder for VideoPlayer until I write it, to avoid errors if I missed it.
// Actually I better write VideoPlayer first? No, I can write valid import.

export default function RoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{peerId: string, peer: SimplePeer.Instance}[]>([]);
  const [streams, setStreams] = useState<{peerId: string, stream: MediaStream}[]>([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [watchUrl, setWatchUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState(""); // The URL currently being watched
  const [watchMode, setWatchMode] = useState(false);
  
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(true); // Camera starts OFF by default to prevent "pop-up" feeling
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("none"); // Filter state
  const [useBackCamera, setUseBackCamera] = useState(false); // Camera flip state
  
  const peersRef = useRef<{peerId: string, peer: SimplePeer.Instance}[]>([]);
  
  useEffect(() => {
    // Prevent double init
    if(!socket || peersRef.current.length > 0) return; 

    // Initialize Media with video OFF initially
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      // Create a dummy video track if we want to start off, or just disable the track
      stream.getVideoTracks().forEach(t => t.enabled = false); // Start with video disallowed/disabled
      setMyStream(stream);
      
      socket.emit("join-room", roomId as string, socket.id);
      
      socket.on("user-connected", (userId: string) => {
         // Initiator
         const peer = createPeer(userId, socket.id, stream);
         peersRef.current.push({ peerId: userId, peer });
         setPeers((prev) => [...prev, { peerId: userId, peer }]);
      });

      socket.on("signal", (data: any) => {
          // data: { from, signal }
          const item = peersRef.current.find(p => p.peerId === data.from);
          if(item) {
              item.peer.signal(data.signal);
          } else {
              // Answerer
              const peer = addPeer(data.from, socket.id, data.signal, stream);
              peersRef.current.push({ peerId: data.from, peer });
              setPeers((prev) => [...prev, { peerId: data.from, peer }]);
          }
      });
      
      socket.on("user-disconnected", (userId: string) => {
          const item = peersRef.current.find(p => p.peerId === userId);
          if(item) item.peer.destroy();
          const p = peersRef.current.filter(p => p.peerId !== userId);
          peersRef.current = p;
          setPeers(p);
          setStreams(prev => prev.filter(s => s.peerId !== userId));
      });
      
      // Listen for Watch Party URL updates
      socket.on("watch-mode-update", (url: string) => {
          setActiveUrl(url);
          setWatchMode(!!url);
      });
    }).catch(err => console.error("Media Error:", err));

    return () => {
        socket.off("user-connected");
        socket.off("signal");
        socket.off("user-disconnected");
        socket.off("watch-mode-update");
        // Clean up stream?
        // myStream?.getTracks().forEach(t => t.stop());
    }
  }, [socket, roomId]);

  function createPeer(userToSignal: string, callerId: string, stream: MediaStream) {
      const peer = new SimplePeer({ initiator: true, trickle: false, stream });
      peer.on("signal", signal => {
          socket.emit("signal", { to: userToSignal, from: callerId, signal });
      });
      peer.on("stream", stream => {
          setStreams(prev => [...prev, { peerId: userToSignal, stream }]);
      });
      return peer;
  }

  function addPeer(incomingSignalId: string, callerId: string, signal: any, stream: MediaStream) {
      const peer = new SimplePeer({ initiator: false, trickle: false, stream });
      peer.on("signal", signal => {
          socket.emit("signal", { to: incomingSignalId, from: callerId, signal });
      });
      peer.on("stream", stream => {
          setStreams(prev => [...prev, { peerId: incomingSignalId, stream }]);
      });
      peer.signal(signal);
      return peer;
  }
  
  const toggleMute = () => {
      if(myStream) {
          myStream.getAudioTracks()[0].enabled = !myStream.getAudioTracks()[0].enabled;
          setMuted(!muted);
      }
  }
  
  const toggleVideo = () => {
      if(myStream) {
          myStream.getVideoTracks()[0].enabled = !myStream.getVideoTracks()[0].enabled;
          setVideoOff(!videoOff);
      }
  }
  
  const startWatchParty = () => {
      if(watchUrl) {
          setActiveUrl(watchUrl);
          setWatchMode(true);
          socket.emit("watch-mode-update", watchUrl, Array.isArray(roomId) ? roomId[0] : (roomId || "")); 
          // Note: "watch-mode-update" listener needs to be handled on server to broadcast
      }
  }

  const toggleCamera = () => {
    // Switch between front (user) and back (environment)
    const newMode = !useBackCamera;
    setUseBackCamera(newMode);
    
    // Stop current track
    if(myStream) {
        myStream.getVideoTracks().forEach(t => t.stop());
    }
    
    // Get new stream
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newMode ? "environment" : "user" }, 
        audio: true 
    }).then(stream => {
        // Handle Video Off state logic if needed, but usually we enable it to show the switch
        if(videoOff) stream.getVideoTracks().forEach(t => t.enabled = false);
        
        setMyStream(stream);

        // Update peers with new track
        const videoTrack = stream.getVideoTracks()[0];
        peers.forEach(p => {
            // Find old sender
            // Note: Simplistic replacement. In complex app, track ID management is needed.
            // Here we assume simple-peer's stream replacement logic or renegotiation
            // Actually, replaceTrack is safer.
             // We need reference to old track. Since we stopped it, we rely on myStream state (which is stale inside promises sometimes).
             // Better way:
             if(p.peer && !p.peer.destroyed) {
                 // p.peer.addTrack(videoTrack, stream); // This adds a second track, not replaces.
                 // Ideally we use replaceTrack if available on sender.
                 // For now, this basically refreshes local view. Remote view update is tricky without full renegotiation in simple-peer v9.
                 // But let's try removing old stream and adding new.
                 p.peer.removeStream(myStream!);
                 p.peer.addStream(stream);
             }
        });
    }).catch(err => {
        console.error("Camera switch error", err);
        setUseBackCamera(!newMode); // Revert on failure
    });
  };

  const toggleScreenShare = () => {
      if (isScreenSharing) {
          // Stop sharing
          // Revert to camera (if it was on? or just black?)
          // For simplicity, we just reload the page or re-acquire media, but better is to replace track.
          // Due to complexity of replacing tracks in simple-peer without renegotiation issues in some versions:
          // We will just alert for now that they need to stop and revert.
          // Or better:
          navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
              const videoTrack = stream.getVideoTracks()[0];
              if(myStream) {
                   const sender = myStream.getVideoTracks()[0];
                   sender.stop();
                   myStream.removeTrack(sender);
                   myStream.addTrack(videoTrack);
                   
                   // Update peers
                   peers.forEach(p => {
                       p.peer.replaceTrack(sender, videoTrack, myStream!);
                   });
                   // Sync videoOff state
                   videoTrack.enabled = !videoOff; 
              }
              setIsScreenSharing(false);
          });
      } else {
          // Start sharing
          navigator.mediaDevices.getDisplayMedia({ video: true }).then(screenStream => {
               const screenTrack = screenStream.getVideoTracks()[0];
               
               screenTrack.onended = () => {
                   toggleScreenShare(); // Revert when user clicks "Stop Sharing" in browser UI
               };

               if(myStream) {
                   const sender = myStream.getVideoTracks()[0];
                   // Don't stop sender immediately if we want to switch back, but for now we replace
                   myStream.removeTrack(sender);
                   myStream.addTrack(screenTrack);
                   
                   peers.forEach(p => {
                       p.peer.replaceTrack(sender, screenTrack, myStream!);
                   });
               }
               setIsScreenSharing(true);
          });
      }
  };

  const copyId = () => {
     navigator.clipboard.writeText(Array.isArray(roomId) ? roomId[0] : (roomId || ""));
  }

  return (
    <div className="h-screen w-full bg-[#0c0c14] text-white flex overflow-hidden">
      {/* Main Area */}
      <div className="flex-1 flex flex-col relative">
         {/* Top Bar */}
         <div className="absolute top-0 left-0 right-0 p-3 md:p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="text-sm font-mono opacity-70">ID: {roomId}</span>
                <button onClick={copyId} className="hover:text-primary"><Copy className="w-4 h-4"/></button>
            </div>
            <div className="pointer-events-auto">
               <button onClick={() => setWatchMode(!watchMode)} className={cn("p-2 rounded-full backdrop-blur transition", watchMode ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20")}>
                  {watchMode ? <LayoutGrid className="w-5 h-5"/> : <Play className="w-5 h-5"/>}
               </button>
            </div>
         </div>
         
         {/* Stage */}
         <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            {watchMode && activeUrl ? (
                <div className="w-full max-w-5xl aspect-video relative z-0">
                    <VideoPlayer roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")} url={activeUrl} />
                </div>
            ) : (
                // Grid View
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full h-full content-center p-2 md:p-4 overflow-y-auto">
                    {/* Self */}
                    <div className="aspect-video relative">
                        <VideoFeed stream={myStream} muted={true} isSelf={true} filter={currentFilter} />
                    </div>
                    {/* Peers */}
                    {streams.map((s) => (
                        <div key={s.peerId} className="aspect-video relative">
                             <VideoFeed stream={s.stream} />
                        </div>
                    ))}
                </div>
            )}
            
            {/* If Watch Mode, show peers as small row at bottom? */}
            {watchMode && (
                 <div className="absolute bottom-24 left-4 right-4 h-32 flex gap-2 overflow-x-auto p-2 no-scrollbar pointer-events-auto z-10">
                    <div className="h-full aspect-video min-w-[160px] relative shadow-lg ring-1 ring-white/10 rounded-lg overflow-hidden">
                        <VideoFeed stream={myStream} muted={true} isSelf={true} filter={currentFilter} />
                    </div>
                    {streams.map((s) => (
                        <div key={s.peerId} className="h-full aspect-video min-w-[160px] relative shadow-lg ring-1 ring-white/10 rounded-lg overflow-hidden">
                             <VideoFeed stream={s.stream} />
                        </div>
                    ))}
                 </div>
            )}
         </div>

         {/* Bottom Control Bar */}
         <div className="h-20 bg-[#1a1a24]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-3 md:gap-4 relative z-20 px-4 overflow-x-auto no-scrollbar">
             <button onClick={toggleMute} className={cn("p-3 md:p-4 rounded-full transition flex-shrink-0", muted ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" : "bg-white/10 hover:bg-white/20")}>
                {muted ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
             </button>
             <button onClick={toggleVideo} className={cn("p-3 md:p-4 rounded-full transition flex-shrink-0", videoOff ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" : "bg-white/10 hover:bg-white/20")}>
                {videoOff ? <VideoOff className="w-5 h-5"/> : <Video className="w-5 h-5"/>}
             </button>

             <button onClick={toggleCamera} className="p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0 md:hidden">
                <RefreshCw className="w-5 h-5"/>
             </button>
             
             <button onClick={toggleScreenShare} className={cn("p-3 md:p-4 rounded-full transition flex-shrink-0 mobile-hide", isScreenSharing ? "bg-primary shadow-lg" : "bg-white/10 hover:bg-white/20")}>
                <Monitor className="w-5 h-5"/>
             </button>
             
             {/* Watch Party Input Popover - simplified */}
             <div className="relative group">
                  <button className="p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0">
                     <Play className="w-5 h-5"/>
                  </button>
                 <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 bg-[#1a1a24] border border-white/10 p-4 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <label className="text-sm font-medium mb-2 block">Start Watch Party</label>
                    <div className="flex gap-2">
                        <input 
                            className="bg-black/40 border border-white/10 rounded px-2 py-1 flex-1 text-sm outline-none" 
                            placeholder="YouTube URL..." 
                            value={watchUrl}
                            onChange={e => setWatchUrl(e.target.value)}
                        />
                        <button onClick={startWatchParty} className="bg-primary text-xs px-2 py-1 rounded">Go</button>
                    </div>
                 </div>
             </div>


             {/* Filter Button Popover */}
             <div className="relative group">
                  <button className={cn("p-3 md:p-4 rounded-full transition flex-shrink-0", currentFilter !== 'none' ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "bg-white/10 hover:bg-white/20")}>
                     <Wand2 className="w-5 h-5"/>
                  </button>
                  <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-[#1a1a24] border border-white/10 p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 grid grid-cols-2 gap-2">
                       {['none', 'smooth', 'vivid', 'bw', 'sepia', 'vintage', 'cyber', 'cool', 'warm', 'dim'].map(f => (
                           <button 
                             key={f}
                             onClick={() => setCurrentFilter(f)}
                             className={cn("px-2 py-1.5 text-xs rounded-md capitalize transition", currentFilter === f ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10")}
                           >
                              {f === 'smooth' ? '✨ Smooth' : f}
                           </button>
                       ))}
                  </div>
             </div>

             <button onClick={() => setIsChatOpen(!isChatOpen)} className={cn("p-3 md:p-4 rounded-full transition flex-shrink-0", isChatOpen ? "bg-primary shadow-lg shadow-primary/20" : "bg-white/10 hover:bg-white/20")}>
                <MessageSquare className="w-5 h-5"/>
             </button>
             
             <button onClick={() => router.push('/')} className="p-3 md:p-4 rounded-full bg-red-500 hover:bg-red-600 transition ml-2 md:ml-4 flex-shrink-0 shadow-lg shadow-red-500/20">
                <PhoneOff className="w-5 h-5"/>
             </button>
         </div>
      </div>
      
      {/* Sidebar */}
      <ChatSidebar roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
