"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import SimplePeer from "simple-peer";
import { Mic, MicOff, Video, VideoOff, Monitor, Play, MessageSquare, PhoneOff, Copy, Share2, LayoutGrid } from "lucide-react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { VideoFeed } from "@/components/video-feed"; 
import { VideoPlayer } from "@/components/video-player"; // We haven't created this file yet, but I will next.
import { cn } from "@/lib/utils";

import { Wand2, RefreshCw, Mic2 } from "lucide-react"; // Import Wand, Refresh, and Mic2 icons
// Create a Placeholder for VideoPlayer until I write it, to avoid errors if I missed it.
// Actually I better write VideoPlayer first? No, I can write valid import.

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId;
  const searchParams = useSearchParams();
  const userNameParam = searchParams?.get('name');
  const [userName, setUserName] = useState<string>("");

  const router = useRouter();
  const { socket, isConnected } = useSocket();
  
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{peerId: string, peer: SimplePeer.Instance, name: string}[]>([]);
  const [streams, setStreams] = useState<{peerId: string, stream: MediaStream, name: string}[]>([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [watchUrl, setWatchUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState(""); // The URL currently being watched
  const [watchMode, setWatchMode] = useState(false);
  
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(true); // Camera starts OFF by default to prevent "pop-up" feeling
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("none"); // Filter state
  const [useBackCamera, setUseBackCamera] = useState(false); // Camera flip state
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Filter menu toggle
  const [isWatchOpen, setIsWatchOpen] = useState(false); // Watch menu toggle
  const [elapsedTime, setElapsedTime] = useState(0); // Call timer
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false); // Leave confirmation modal
  const [voiceEffect, setVoiceEffect] = useState("none"); // Voice changer state
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [hearMyself, setHearMyself] = useState(false); // Audio monitoring
  const [notifications, setNotifications] = useState<{id: string, senderName: string, text: string}[]>([]);

  // Socket Message Listener for Notifications
  useEffect(() => {
    if(!socket) return;
    
    const handleNewMessage = (msg: { text: string; senderId: string; senderName: string }) => {
        // Don't notify for own messages
        if(msg.senderId === socket.id) return;
        
        // Don't notify if chat is open? (Optional, but user asked for popups, usually implies when attention is away, but keeps it consistent to always show).
        // Let's show it to ensure "pop-up notification" requirement is met visibly. 
        
        const id = Math.random().toString(36).substring(7); // Simple ID
        setNotifications(prev => [...prev, { id, senderName: msg.senderName, text: msg.text }]);
        
        // Auto-dismiss
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    socket.on("receive-message", handleNewMessage);
    return () => {
        socket.off("receive-message", handleNewMessage);
    }
  }, [socket]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const originalAudioStreamRef = useRef<MediaStream | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const processingNodeRef = useRef<AudioNode | null>(null);

  // Store audio graph nodes to cleanup later
  const audioGraphRef = useRef<{ source: MediaStreamAudioSourceNode | null, nodes: AudioNode[] }>({ source: null, nodes: [] });

  const applyVoice = (effect: string) => {
      setVoiceEffect(effect);
      setIsVoiceMenuOpen(false);

      if(!originalAudioStreamRef.current && myStream) {
          originalAudioStreamRef.current = new MediaStream(myStream.getAudioTracks());
      }
      if(!originalAudioStreamRef.current) return;

      if(!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Ensure Destination
      if(!audioDestinationRef.current) {
           audioDestinationRef.current = ctx.createMediaStreamDestination();
      }
      const dest = audioDestinationRef.current;

      // Cleanup Old Graph
      // We must disconnect the specific nodes we created, avoiding breaking the destination if possible.
      // But easiest way to "switch" is to disconnect the old source from everything
      if (audioGraphRef.current.source) {
          try { audioGraphRef.current.source.disconnect(); } catch(e) {}
      }
      // Also disconnect any intermediate nodes if we tracked them (optional if source is cut)
      audioGraphRef.current.nodes.forEach(n => {
          try { n.disconnect(); } catch(e) {}
      });
      audioGraphRef.current.nodes = [];

      // Create New Source
      const sourceStream = originalAudioStreamRef.current;
      const source = ctx.createMediaStreamSource(sourceStream);
      audioGraphRef.current.source = source;
      
      let finalOutput: AudioNode = source;

      if(effect === 'man') {
           const biquad = ctx.createBiquadFilter();
           biquad.type = 'lowshelf';
           biquad.frequency.value = 200;
           biquad.gain.value = 15;
           source.connect(biquad);
           
           // Maybe chain another for depth?
           const compressor = ctx.createDynamicsCompressor();
           biquad.connect(compressor);
           
           finalOutput = compressor;
           audioGraphRef.current.nodes.push(biquad, compressor);

      } else if (effect === 'woman') {
           const biquad = ctx.createBiquadFilter();
           biquad.type = 'highshelf';
           biquad.frequency.value = 2000;
           biquad.gain.value = 15;
           
           const biquad2 = ctx.createBiquadFilter();
           biquad2.type = 'peaking';
           biquad2.frequency.value = 1000;
           biquad2.Q.value = 1;
           biquad2.gain.value = 5;

           source.connect(biquad);
           biquad.connect(biquad2);
           finalOutput = biquad2;
           audioGraphRef.current.nodes.push(biquad, biquad2);

      } else if (effect === 'robot') {
           const osc = ctx.createOscillator();
           osc.frequency.value = 50; 
           osc.type = 'sawtooth';
           osc.start();
           
           const ringGain = ctx.createGain();
           ringGain.gain.value = 0.0; // signal * osc
           
           // AM Synthesis: Source * Osc
           // But native nodes don't multiply easily without AudioWorklet.
           // Trick: Connect Osc to Gain.gain? No, that modulates amplitude of what goes through Gain.
           // So: Source -> Gain. Osc -> Gain.gain.
           
           source.connect(ringGain);
           osc.connect(ringGain.gain);
           
           finalOutput = ringGain;
           audioGraphRef.current.nodes.push(osc, ringGain);

      } else if (effect === 'echo') {
           const delay = ctx.createDelay();
           delay.delayTime.value = 0.2;
           const feedback = ctx.createGain();
           feedback.gain.value = 0.4;
           
           source.connect(delay);
           delay.connect(feedback);
           feedback.connect(delay);
           
           const merger = ctx.createChannelMerger(1); // Merge Dry + Wet (Delay) to Dest
           // We can just connect multiple nodes to Dest
           source.connect(dest);
           delay.connect(dest);
           
           audioGraphRef.current.nodes.push(delay, feedback);
           // Special case: we already connected to dest
           finalOutput = null as any; 
      }

      if(effect === 'none') {
           source.connect(dest);
      } else if (finalOutput) {
           finalOutput.connect(dest);
      }

      // Track for "Hear Myself" feature
      processingNodeRef.current = finalOutput || dest;

      // Replace Track in Peer Connections
      const newTrack = dest.stream.getAudioTracks()[0];
      peersRef.current.forEach(p => {
             if(p.peer && !p.peer.destroyed) {
                 const pc = (p.peer as any)._pc; 
                 if (pc) {
                     const senders = pc.getSenders();
                     const audioSender = senders.find((s: RTCRtpSender) => s.track && s.track.kind === 'audio');
                     if(audioSender) {
                         audioSender.replaceTrack(newTrack).catch((e: any) => console.log("Replace Track Error", e));
                     }
                 }
             }
      });
  };

  const toggleHearMyself = () => {
      const newState = !hearMyself;
      setHearMyself(newState);
      if (processingNodeRef.current && audioContextRef.current) {
          if (newState) {
              processingNodeRef.current.connect(audioContextRef.current.destination);
          } else {
              try { processingNodeRef.current.disconnect(audioContextRef.current.destination); } catch(e) {}
          }
      }
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
     const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
     return () => clearInterval(timer);
  }, []);
  
  // Need to store metadata about peers
  const peersRef = useRef<{peerId: string, peer: SimplePeer.Instance, name: string}[]>([]);

  useEffect(() => {
     if(userNameParam) setUserName(userNameParam);
  }, [userNameParam]);
  
  useEffect(() => {
    // Prevent double init
    if(!socket || peersRef.current.length > 0 || !userNameParam) return; 

    // Initialize Media with video OFF initially
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      // Create a dummy video track if we want to start off, or just disable the track
      stream.getVideoTracks().forEach(t => t.enabled = false); // Start with video disallowed/disabled
      setMyStream(stream);
      
      socket.emit("join-room", roomId as string, socket.id, userNameParam);
      
      socket.on("user-connected", (userId: string, remoteUserName: string) => {
         console.log("User connected:", userId, remoteUserName);
         // Initiator
         const peer = createPeer(userId, socket.id, stream);
         const name = remoteUserName || "User";
         peersRef.current.push({ peerId: userId, peer, name });
         setPeers((prev) => [...prev, { peerId: userId, peer, name }]);
      });

      socket.on("signal", (data: any) => {
          // data: { from, signal, userName }
          const item = peersRef.current.find(p => p.peerId === data.from);
          if(item) {
              item.peer.signal(data.signal);
          } else {
              // Answerer
              const name = data.userName || "User";
              const peer = addPeer(data.from, socket.id, data.signal, stream, name); // Pass name to signal or handle it?
              // Wait, addPeer logic needs to store the name.
              peersRef.current.push({ peerId: data.from, peer, name });
              setPeers((prev) => [...prev, { peerId: data.from, peer, name }]);
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
      
      socket.on("room-full", () => {
          alert("Room limit reached (Max 4 participants). You cannot join.");
          window.location.href = '/';
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
          socket.emit("signal", { to: userToSignal, from: callerId, signal, userName: userNameParam });
      });
      peer.on("stream", stream => {
          // Find name from peersRef because this is async stream event
          const p = peersRef.current.find(x => x.peerId === userToSignal);
          setStreams(prev => {
              const existing = prev.find(s => s.peerId === userToSignal);
              if (existing && existing.stream.id === stream.id) return prev; // Identical stream, skip
              const others = prev.filter(s => s.peerId !== userToSignal);
              return [...others, { peerId: userToSignal, stream, name: p?.name || "User" }];
          });
      });
      return peer;
  }

  function addPeer(incomingSignalId: string, callerId: string, signal: any, stream: MediaStream, incomingName: string) {
      const peer = new SimplePeer({ initiator: false, trickle: false, stream });
      peer.on("signal", signal => {
          // Send back my name as well
          socket.emit("signal", { to: incomingSignalId, from: callerId, signal, userName: userNameParam });
      });
      peer.on("stream", stream => {
           setStreams(prev => {
               const existing = prev.find(s => s.peerId === incomingSignalId);
               if (existing && existing.stream.id === stream.id) return prev;
               const others = prev.filter(s => s.peerId !== incomingSignalId);
               return [...others, { peerId: incomingSignalId, stream, name: incomingName }];
           });
      });
      peer.signal(signal);
      return peer;
  }
  
  const toggleMute = () => {
      if(myStream) {
          const audioTrack = myStream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMuted(!muted);
          }
      } else {
          // Fallback if stream isn't ready
          console.warn("Audio stream not ready");
      }
  }
  
  // Toggle Video (Mute/Unmute Video Track)
  const toggleVideo = () => {
      if(myStream) {
          const videoTrack = myStream.getVideoTracks()[0];
          if(videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
              setVideoOff(!videoTrack.enabled);
              // Note: No need to replace stream here, just enabling/disabling track sends black frame or silence.
          }
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
        // Handle Video Off state
        const newVideoTrack = stream.getVideoTracks()[0];
        if(videoOff) newVideoTrack.enabled = false;
        
        // --- Local Update ---
        // Instead of replacing the entire stream object (which might cause React re-mount),
        // let's try to update the tracks if possible, or just be careful.
        // Actually, replacing stream state is safer for React cleanliness, but to "not create new screen",
        // we generally rely on the VideoFeed component simply receiving new srcObject.
        setMyStream(stream);

        // --- Broadcast Update to Peers ---
        peersRef.current.forEach(p => {
             if(p.peer && !p.peer.destroyed) {
                 const pc = (p.peer as any)._pc; 
                 if (pc) {
                     const senders = pc.getSenders();
                     const videoSender = senders.find((s: RTCRtpSender) => s.track && s.track.kind === 'video');
                     
                     if(videoSender) {
                         // Seamless switch: Replace the track being sent.
                         // The receiver will see the video content change, but the stream ID / track ID usually stays
                         // or is handled by the browser's RTCPeerConnection without a new 'addStream' event.
                         videoSender.replaceTrack(newVideoTrack).catch((e: any) => console.log("Track replace failed", e));
                     } 
                     // We intentionally REMOVED the 'else { addStream }' block.
                     // If there is no existing video sender, we do NOT want to add a new stream
                     // because that would create a new video element (pop-up) on the receiver's side.
                     // We act strictly "within the existing video stream".
                 }
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

  const leaveRoom = () => {
      setIsLeaveModalOpen(true);
  };

  const confirmLeave = () => {
      // Optional: Stop tracks before leaving
      myStream?.getTracks().forEach(track => track.stop());
      router.push('/');
  };

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
            
             {/* Call Timer */}
             <div className="pointer-events-auto bg-red-500/20 backdrop-blur px-3 py-1 rounded-full border border-red-500/50">
                 <span className="text-sm font-mono font-medium text-white flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                     {formatTime(elapsedTime)}
                 </span>
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
                        <VideoFeed stream={myStream} muted={true} isSelf={true} filter={currentFilter} name={userName || "You"} />
                    </div>
                    {/* Peers */}
                    {streams.map((s) => (
                        <div key={s.peerId} className="aspect-video relative">
                             <VideoFeed stream={s.stream} name={s.name} />
                        </div>
                    ))}
                </div>
            )}
            
            {/* If Watch Mode, show peers as small row at bottom? */}
            {watchMode && (
                 <div className="absolute bottom-24 left-4 right-4 h-32 flex gap-2 overflow-x-auto p-2 no-scrollbar pointer-events-auto z-10">
                    <div className="h-full aspect-video min-w-[160px] relative shadow-lg ring-1 ring-white/10 rounded-lg overflow-hidden">
                        <VideoFeed stream={myStream} muted={true} isSelf={true} filter={currentFilter} name={userName || "You"} />
                    </div>
                    {streams.map((s) => (
                        <div key={s.peerId} className="h-full aspect-video min-w-[160px] relative shadow-lg ring-1 ring-white/10 rounded-lg overflow-hidden">
                             <VideoFeed stream={s.stream} name={s.name} />
                        </div>
                    ))}
                 </div>
            )}
         </div>

         {/* Bottom Control Bar */}
         <div className="h-16 md:h-20 bg-[#1a1a24]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between md:justify-center px-2 md:px-4 relative z-20 shrink-0 safe-pb">
             {/* Left Group */}
             <div className="flex items-center justify-center gap-1 sm:gap-2">
                 <button onClick={toggleMute} className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", muted ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" : "bg-white/10 hover:bg-white/20")}>
                    {muted ? <MicOff className="w-4 h-4 md:w-5 md:h-5"/> : <Mic className="w-4 h-4 md:w-5 md:h-5"/>}
                 </button>
                 <button onClick={toggleVideo} className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", videoOff ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" : "bg-white/10 hover:bg-white/20")}>
                    {videoOff ? <VideoOff className="w-4 h-4 md:w-5 md:h-5"/> : <Video className="w-4 h-4 md:w-5 md:h-5"/>}
                 </button>

                 <button onClick={toggleCamera} className="p-2 md:p-4 rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0 md:hidden">
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5"/>
                 </button>
                 
                 <button onClick={toggleScreenShare} className={cn("hidden md:flex p-2 md:p-4 rounded-full transition flex-shrink-0", isScreenSharing ? "bg-primary shadow-lg" : "bg-white/10 hover:bg-white/20")}>
                    <Monitor className="w-4 h-4 md:w-5 md:h-5"/>
                 </button>
             </div>

             {/* Center/Right Group - distributed for access */}
             <div className="flex items-center justify-center gap-1 sm:gap-2">
                 {/* Watch Party Input Popover */}
                 <div className="relative">
                      <button 
                        onClick={() => setIsWatchOpen(!isWatchOpen)}
                        className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", isWatchOpen || watchMode ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20")}
                      >
                         <Play className="w-4 h-4 md:w-5 md:h-5"/>
                      </button>
                     {isWatchOpen && (
                         <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-72 md:w-80 bg-[#1a1a24] border border-white/10 p-4 rounded-xl shadow-2xl z-50">
                            <label className="text-sm font-medium mb-2 block">
                                {activeUrl ? "Current Watch Party" : "Start Watch Party"}
                            </label>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <input 
                                        className="bg-black/40 border border-white/10 rounded px-2 py-2 flex-1 text-xs md:text-sm outline-none placeholder:text-muted-foreground/50" 
                                        placeholder="YouTube URL..." 
                                        value={watchUrl}
                                        onChange={e => setWatchUrl(e.target.value)}
                                    />
                                    <button 
                                        onClick={() => { startWatchParty(); setIsWatchOpen(false); }} 
                                        className="bg-primary hover:bg-primary/90 text-xs md:text-sm px-3 py-2 rounded font-medium transition"
                                    >
                                        Play
                                    </button>
                                </div>
                                {activeUrl && (
                                    <button 
                                        onClick={() => { 
                                            setActiveUrl(""); 
                                            setWatchMode(false); 
                                            setWatchUrl("");
                                            socket?.emit("watch-mode-update", "", Array.isArray(roomId) ? roomId[0] : (roomId || "")); 
                                            setIsWatchOpen(false);
                                        }} 
                                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs py-2 rounded transition"
                                    >
                                        End Watch Party
                                    </button>
                                )}
                            </div>
                         </div>
                     )}
                 </div>

                 {/* Filter Button Popover */}
                 <div className="relative">
                      <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)} 
                        className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", (currentFilter !== 'none' || isFilterOpen) ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "bg-white/10 hover:bg-white/20")}
                      >
                         <Wand2 className="w-4 h-4 md:w-5 md:h-5"/>
                      </button>
                      {isFilterOpen && (
                          <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-[#1a1a24] border border-white/10 p-3 rounded-xl shadow-2xl grid grid-cols-2 gap-2 z-50 max-h-[60vh] overflow-y-auto">
                               {['none', 'smooth', 'vivid', 'bw', 'sepia', 'vintage', 'cyber', 'cool', 'warm', 'dim', 'invert'].map(f => (
                                   <button 
                                     key={f}
                                     onClick={() => { setCurrentFilter(f); setIsFilterOpen(false); }}
                                     className={cn("px-2 py-1.5 text-xs rounded-md capitalize transition", currentFilter === f ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10")}
                                   >
                                      {f === 'smooth' ? '✨ Smooth' : f}
                                   </button>
                               ))}
                          </div>
                      )}
                 </div>

                 {/* Voice Changer Button */}
                 <div className="relative">
                      <button 
                        onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)} 
                        className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", voiceEffect !== 'none' ? "bg-pink-600 text-white shadow-lg shadow-pink-500/30" : "bg-white/10 hover:bg-white/20")}
                      >
                         <Mic2 className="w-4 h-4 md:w-5 md:h-5"/>
                      </button>
                      {isVoiceMenuOpen && (
                          <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-40 bg-[#1a1a24] border border-white/10 p-2 rounded-xl shadow-2xl flex flex-col gap-1 z-50">
                               {['none', 'man', 'woman', 'robot', 'echo'].map(v => (
                                   <button 
                                     key={v}
                                     onClick={() => applyVoice(v)}
                                     className={cn("px-3 py-2 text-sm rounded-lg capitalize transition text-left", voiceEffect === v ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10")}
                                   >
                                      {v === 'man' ? '👨 Man' : v === 'woman' ? '👩 Woman' : v === 'robot' ? '🤖 Robot' : v === 'echo' ? '🗣️ Echo' : 'Normal'}
                                   </button>
                               ))}
                          </div>
                      )}
                 </div>

                 <button onClick={() => setIsChatOpen(!isChatOpen)} className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", isChatOpen ? "bg-primary shadow-lg shadow-primary/20" : "bg-white/10 hover:bg-white/20")}>
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5"/>
                 </button>
                 
                 <button onClick={leaveRoom} className="p-2 md:p-4 rounded-full bg-red-500 hover:bg-red-600 transition flex-shrink-0 shadow-lg shadow-red-500/20">
                    <PhoneOff className="w-4 h-4 md:w-5 md:h-5"/>
                 </button>
             </div>
         </div>
      </div>
      
      {/* Sidebar */}
      <ChatSidebar roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} userName={userName || userNameParam || "User"} />
       
       {/* Message Notifications */}
       <div className="absolute top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none">
          {notifications.map((n) => (
             <div key={n.id} className="bg-[#1a1a24]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 w-64 pointer-events-auto">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
                    {n.senderName[0]}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{n.senderName}</h4>
                    <p className="text-xs text-muted-foreground truncate">{n.text}</p>
                 </div>
             </div>
          ))}
       </div>
       
       {/* Custom Leave Confirmation Modal */}
       {isLeaveModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-[#1a1a24] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
                   <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                       <PhoneOff className="w-6 h-6" />
                   </div>
                   <div>
                       <h3 className="text-xl font-semibold text-white">Leave Room?</h3>
                       <p className="text-muted-foreground text-sm mt-1">Are you sure you want to end the call and leave this room?</p>
                   </div>
                   <div className="grid grid-cols-2 gap-3 pt-2">
                       <button 
                           onClick={() => setIsLeaveModalOpen(false)}
                           className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition"
                       >
                           Cancel
                       </button>
                       <button 
                           onClick={confirmLeave}
                           className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition shadow-lg shadow-red-500/20"
                       >
                           Leave Room
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}
