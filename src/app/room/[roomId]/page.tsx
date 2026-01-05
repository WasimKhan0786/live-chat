"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import SimplePeer from "simple-peer";
import { Mic, MicOff, Video, VideoOff, Monitor, Play, MessageSquare, PhoneOff, Copy, Share2, LayoutGrid, Globe, X, Search, Wand2, RefreshCw, Mic2 } from "lucide-react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { VideoFeed } from "@/components/video-feed"; 
import { VideoPlayer } from "@/components/video-player"; 
import { cn } from "@/lib/utils";

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
  const [activeUrl, setActiveUrl] = useState(""); 
  const [watchMode, setWatchMode] = useState(false);
  
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(true); 
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("none"); 
  const [useBackCamera, setUseBackCamera] = useState(false); 
  const [isFilterOpen, setIsFilterOpen] = useState(false); 
  const [isWatchOpen, setIsWatchOpen] = useState(false); 
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false); 
  const [voiceEffect, setVoiceEffect] = useState("none"); 
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [hearMyself, setHearMyself] = useState(false); 
  const [notifications, setNotifications] = useState<{id: string, senderName: string, text: string}[]>([]);
  
  // Search State
  const [searchResults, setSearchResults] = useState<{id: string, title: string, thumbnail: string, timestamp: string, author: string, url: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mini Browser State
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("https://www.google.com"); 
  const [tempBrowserUrl, setTempBrowserUrl] = useState(""); 

  const handleSearch = async () => {
      if(!watchUrl.trim()) return;
      if(watchUrl.startsWith('http')) {
          startWatchParty(); 
          return;
      }
      
      setIsSearching(true);
      setSearchResults([]);
      try {
          const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(watchUrl)}`);
          const data = await res.json();
          if(data.videos) {
              setSearchResults(data.videos);
          }
      } catch(e) {
          console.error("Search failed", e);
      } finally {
          setIsSearching(false);
      }
  };

  useEffect(() => {
    if(!socket) return;
    
    // Chat Notification
    const handleNewMessage = (msg: { text: string; senderId: string; senderName: string }) => {
        if(msg.senderId === socket.id) return;
        const id = Math.random().toString(36).substring(7); 
        setNotifications(prev => [...prev, { id, senderName: msg.senderName, text: msg.text }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    // Browser Sync
    const handleBrowserUpdate = (url: string) => {
        setBrowserUrl(url);
        setIsBrowserOpen(true);
    };

    socket.on("receive-message", handleNewMessage);
    socket.on("browser-update", handleBrowserUpdate);

    return () => {
        socket.off("receive-message", handleNewMessage);
        socket.off("browser-update", handleBrowserUpdate);
    }
  }, [socket]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const originalAudioStreamRef = useRef<MediaStream | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const processingNodeRef = useRef<AudioNode | null>(null);
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

      if(!audioDestinationRef.current) {
           audioDestinationRef.current = ctx.createMediaStreamDestination();
      }
      const dest = audioDestinationRef.current;

      if (audioGraphRef.current.source) {
          try { audioGraphRef.current.source.disconnect(); } catch(e) {}
      }
      audioGraphRef.current.nodes.forEach(n => {
          try { n.disconnect(); } catch(e) {}
      });
      audioGraphRef.current.nodes = [];

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
           ringGain.gain.value = 0.0; 
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
           source.connect(dest);
           delay.connect(dest);
           audioGraphRef.current.nodes.push(delay, feedback);
           finalOutput = null as any; 
      }

      if(effect === 'none') {
           source.connect(dest);
      } else if (finalOutput) {
           finalOutput.connect(dest);
      }

      processingNodeRef.current = finalOutput || dest;

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

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
     const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
     return () => clearInterval(timer);
  }, []);
  
  const peersRef = useRef<{peerId: string, peer: SimplePeer.Instance, name: string}[]>([]);

  useEffect(() => {
     if(userNameParam) setUserName(userNameParam);
  }, [userNameParam]);
  
  useEffect(() => {
    if(!socket || peersRef.current.length > 0 || !userNameParam) return; 

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      stream.getVideoTracks().forEach(t => t.enabled = false); 
      setMyStream(stream);
      
      socket.emit("join-room", roomId as string, socket.id, userNameParam);
      
      socket.on("user-connected", (userId: string, remoteUserName: string) => {
         const peer = createPeer(userId, socket.id, stream);
         const name = remoteUserName || "User";
         peersRef.current.push({ peerId: userId, peer, name });
         setPeers((prev) => [...prev, { peerId: userId, peer, name }]);
      });

      socket.on("signal", (data: any) => {
          const item = peersRef.current.find(p => p.peerId === data.from);
          if(item) {
              item.peer.signal(data.signal);
          } else {
              const name = data.userName || "User";
              const peer = addPeer(data.from, socket.id, data.signal, stream, name); 
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
    }
  }, [socket, roomId]);

  function createPeer(userToSignal: string, callerId: string, stream: MediaStream) {
      const peer = new SimplePeer({ initiator: true, trickle: false, stream });
      peer.on("signal", signal => {
          socket.emit("signal", { to: userToSignal, from: callerId, signal, userName: userNameParam });
      });
      peer.on("stream", stream => {
          const p = peersRef.current.find(x => x.peerId === userToSignal);
          setStreams(prev => {
              const existing = prev.find(s => s.peerId === userToSignal);
              if (existing && existing.stream.id === stream.id) return prev; 
              const others = prev.filter(s => s.peerId !== userToSignal);
              return [...others, { peerId: userToSignal, stream, name: p?.name || "User" }];
          });
      });
      return peer;
  }

  function addPeer(incomingSignalId: string, callerId: string, signal: any, stream: MediaStream, incomingName: string) {
      const peer = new SimplePeer({ initiator: false, trickle: false, stream });
      peer.on("signal", signal => {
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
      }
  }
  
  const toggleVideo = () => {
      if(myStream) {
          const videoTrack = myStream.getVideoTracks()[0];
          if(videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
              setVideoOff(!videoTrack.enabled);
          }
      }
  }
  
  const startWatchParty = () => {
      if(watchUrl) {
          setActiveUrl(watchUrl);
          setWatchMode(true);
          socket.emit("watch-mode-update", watchUrl, Array.isArray(roomId) ? roomId[0] : (roomId || "")); 
      }
  }

  const toggleCamera = () => {
    const newMode = !useBackCamera;
    setUseBackCamera(newMode);
    
    if(myStream) {
        myStream.getVideoTracks().forEach(t => t.stop());
    }
    
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newMode ? "environment" : "user" }, 
        audio: true 
    }).then(stream => {
        const newVideoTrack = stream.getVideoTracks()[0];
        if(videoOff) newVideoTrack.enabled = false;
        
        setMyStream(stream);

        peersRef.current.forEach(p => {
             if(p.peer && !p.peer.destroyed) {
                 const pc = (p.peer as any)._pc; 
                 if (pc) {
                     const senders = pc.getSenders();
                     const videoSender = senders.find((s: RTCRtpSender) => s.track && s.track.kind === 'video');
                     if(videoSender) {
                         videoSender.replaceTrack(newVideoTrack).catch((e: any) => console.log("Track replace failed", e));
                     } 
                 }
             }
        });
    }).catch(err => {
        console.error("Camera switch error", err);
        setUseBackCamera(!newMode); 
    });
  };

  const toggleScreenShare = () => {
      if (isScreenSharing) {
          navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
              const videoTrack = stream.getVideoTracks()[0];
              if(myStream) {
                   const sender = myStream.getVideoTracks()[0];
                   sender.stop();
                   myStream.removeTrack(sender);
                   myStream.addTrack(videoTrack);
                   
                   peers.forEach(p => {
                       p.peer.replaceTrack(sender, videoTrack, myStream!);
                   });
                   videoTrack.enabled = !videoOff; 
              }
              setIsScreenSharing(false);
          });
      } else {
          navigator.mediaDevices.getDisplayMedia({ video: true }).then(screenStream => {
               const screenTrack = screenStream.getVideoTracks()[0];
               
               screenTrack.onended = () => {
                   toggleScreenShare(); 
               };

               if(myStream) {
                   const sender = myStream.getVideoTracks()[0];
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

  const handleBrowserNavigate = (e?: React.FormEvent) => {
      e?.preventDefault();
      let url = tempBrowserUrl;
      if (!url.startsWith('http')) {
           url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
      setBrowserUrl(url);
      socket?.emit("browser-update", url, Array.isArray(roomId) ? roomId[0] : (roomId || ""));
  };

  const copyId = () => {
     navigator.clipboard.writeText(Array.isArray(roomId) ? roomId[0] : (roomId || ""));
  }

  const leaveRoom = () => {
      setIsLeaveModalOpen(true);
  };

  const confirmLeave = () => {
      myStream?.getTracks().forEach(track => track.stop());
      router.push('/');
  };

  return (
    <div className="h-screen w-full bg-[#0c0c14] text-white flex overflow-hidden">
      <div className="flex-1 flex flex-col relative">
         <div className="absolute top-0 left-0 right-0 p-3 md:p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="text-sm font-mono opacity-70">ID: {roomId}</span>
                <button onClick={copyId} className="hover:text-primary"><Copy className="w-4 h-4"/></button>
            </div>
            
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
         
         <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            {watchMode && activeUrl ? (
                <div className="w-full max-w-5xl aspect-video relative z-0">
                    <VideoPlayer roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")} url={activeUrl} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full h-full content-center p-2 md:p-4 overflow-y-auto">
                    <div className="aspect-video relative">
                        <VideoFeed stream={myStream} muted={true} isSelf={true} filter={currentFilter} name={userName || "You"} />
                    </div>
                    {streams.map((s) => (
                        <div key={s.peerId} className="aspect-video relative">
                             <VideoFeed stream={s.stream} name={s.name} />
                        </div>
                    ))}
                </div>
            )}
            
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

         <div className="h-16 md:h-20 bg-[#1a1a24]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between md:justify-center px-2 md:px-4 relative z-20 shrink-0 safe-pb">
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
                 
                 {/* Screen Share */}
                 <button onClick={toggleScreenShare} className={cn("hidden md:flex p-2 md:p-4 rounded-full transition flex-shrink-0", isScreenSharing ? "bg-primary shadow-lg" : "bg-white/10 hover:bg-white/20")}>
                    <Monitor className="w-4 h-4 md:w-5 md:h-5"/>
                 </button>
             </div>

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
                         <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 md:w-96 bg-[#1a1a24] border border-white/10 p-4 rounded-xl shadow-2xl z-50 flex flex-col max-h-[60vh] overflow-hidden">
                            <label className="text-sm font-medium mb-3 flex justify-between items-center shrink-0">
                                <span>{activeUrl ? "Current Watch Party" : "Start Watch Party"}</span>
                                <span className="text-[10px] text-muted-foreground font-normal bg-white/5 px-1.5 py-0.5 rounded">Syncs for everyone</span>
                            </label>
                            
                            {/* Search Input */}
                            <div className="flex flex-col gap-3 shrink-0">
                                <div className="flex gap-2">
                                    <input 
                                        className="bg-black/40 border border-white/10 rounded px-2 py-2 flex-1 text-xs md:text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 transition" 
                                        placeholder="Paste Link OR Type to Search..." 
                                        value={watchUrl}
                                        onChange={e => setWatchUrl(e.target.value)}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') {
                                                if(watchUrl.startsWith('http')) {
                                                    startWatchParty();
                                                    setIsWatchOpen(false);
                                                } else {
                                                    handleSearch();
                                                }
                                            }
                                        }}
                                    />
                                    {watchUrl.startsWith('http') || watchUrl.includes('youtube.com') || watchUrl.includes('youtu.be') ? (
                                        <button 
                                            onClick={() => { startWatchParty(); setIsWatchOpen(false); }} 
                                            className="bg-primary hover:bg-primary/90 text-xs md:text-sm px-4 py-2 rounded font-medium transition flex items-center gap-1"
                                        >
                                            Play
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleSearch} 
                                            disabled={isSearching}
                                            className="bg-white/10 hover:bg-white/20 text-xs md:text-sm px-3 py-2 rounded font-medium transition whitespace-nowrap min-w-[80px] flex items-center justify-center"
                                        >
                                            {isSearching ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : "Search"}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Results List */}
                            {searchResults.length > 0 && (
                                <div className="mt-3 flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground sticky top-0 bg-[#1a1a24] py-1">Search Results</h4>
                                    {searchResults.map((video) => (
                                        <button 
                                            key={video.id}
                                            onClick={() => {
                                                setWatchUrl(video.url);
                                                setActiveUrl(video.url);
                                                setWatchMode(true);
                                                socket?.emit("watch-mode-update", video.url, Array.isArray(roomId) ? roomId[0] : (roomId || ""));
                                                setIsWatchOpen(false);
                                                setSearchResults([]);
                                            }}
                                            className="flex gap-2 p-2 hover:bg-white/5 rounded-lg transition text-left group"
                                        >
                                            <div className="relative w-20 aspect-video bg-black rounded overflow-hidden shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                                <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] px-1 rounded text-white">{video.timestamp}</span>
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h5 className="text-xs font-medium text-white line-clamp-2 leading-tight group-hover:text-primary transition">{video.title}</h5>
                                                <p className="text-[10px] text-muted-foreground">{video.author}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeUrl && (
                                <div className="mt-3 pt-3 border-t border-white/10 shrink-0">
                                    <button 
                                        onClick={() => { 
                                            setActiveUrl(""); 
                                            setWatchMode(false); 
                                            setWatchUrl("");
                                            setSearchResults([]);
                                            socket?.emit("watch-mode-update", "", Array.isArray(roomId) ? roomId[0] : (roomId || "")); 
                                            setIsWatchOpen(false);
                                        }} 
                                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs py-2 rounded transition"
                                    >
                                        Stop Watching
                                    </button>
                                </div>
                            )}
                         </div>
                     )}
                 </div>

                 {/* Mini Browser Button */}
                <div className="relative">
                    <button 
                    onClick={() => setIsBrowserOpen(!isBrowserOpen)}
                    className={cn("hidden md:flex p-2 md:p-4 rounded-full transition flex-shrink-0", isBrowserOpen ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 hover:bg-white/20")}
                    >
                        <Globe className="w-4 h-4 md:w-5 md:h-5"/>
                    </button>
                </div>
                
                {/* Mini Browser Window */}
                {isBrowserOpen && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] md:w-[600px] h-[60vh] bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 resize-y">
                        <div className="bg-black/40 p-3 flex items-center gap-3 border-b border-white/5 cursor-move active:cursor-grabbing">
                            <div className="p-1.5 bg-blue-500/20 rounded-md">
                            <Globe className="w-4 h-4 text-blue-400"/>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white tracking-wide">SHARED BROWSER</span>
                                <span className="text-[10px] text-muted-foreground">Synced with everyone in room</span>
                            </div>
                            <div className="flex-1"/>
                            <button onClick={() => setIsBrowserOpen(false)} className="hover:text-red-400 p-1 hover:bg-white/5 rounded transition"><X className="w-4 h-4"/></button>
                        </div>
                        
                        <form onSubmit={handleBrowserNavigate} className="p-2 bg-black/20 flex gap-2 border-b border-white/5">
                            <div className="flex-1 relative flex items-center">
                            <Search className="w-3 h-3 text-muted-foreground absolute left-3"/>
                            <input 
                                className="w-full bg-black/40 border border-white/10 rounded-full pl-8 pr-4 py-2 text-xs md:text-sm text-white outline-none focus:border-blue-500/50 transition placeholder:text-muted-foreground/50"
                                placeholder="Search Google or type URL to browse together..."
                                value={tempBrowserUrl}
                                onChange={(e) => setTempBrowserUrl(e.target.value)}
                            />
                            </div>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 rounded-full text-xs font-bold text-white transition">
                                GO
                            </button>
                        </form>
                        
                        <div className="flex-1 bg-white relative">
                            <iframe 
                                src={browserUrl} 
                                className="w-full h-full border-0"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    </div>
                )}

                 {/* Filter Button */}
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
                               <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Voice FX</div>
                               {['none', 'man', 'woman', 'robot', 'echo'].map(effect => (
                                   <button 
                                     key={effect}
                                     onClick={() => applyVoice(effect)}
                                     className={cn("px-2 py-2 text-xs rounded hover:bg-white/10 text-left capitalize transition flex justify-between items-center group", voiceEffect === effect ? "bg-primary text-white" : "text-white/80")}
                                   >
                                       <span>{effect}</span>
                                       {voiceEffect === effect && <span className="w-1.5 h-1.5 bg-white rounded-full shadow-glow"/>}
                                   </button>
                               ))}
                               <div className="h-px bg-white/10 my-1"/>
                               <button 
                                   onClick={toggleHearMyself}
                                   className={cn("px-2 py-2 text-xs rounded hover:bg-white/10 text-left transition flex items-center justify-between", hearMyself ? "text-green-400" : "text-muted-foreground")}
                               >
                                   <span>Hear Myself</span>
                                   <div className={cn("w-6 h-3 rounded-full relative transition-colors", hearMyself ? "bg-green-500/20" : "bg-white/10")}>
                                       <div className={cn("absolute top-0.5 w-2 h-2 rounded-full transition-transform", hearMyself ? "left-3.5 bg-green-400" : "left-0.5 bg-white/30")}/>
                                   </div>
                               </button>
                          </div>
                      )}
                 </div>

                 <button onClick={() => setIsChatOpen(true)} className="p-2 md:p-4 rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0 relative">
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5"/>
                    {notifications.length > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-[#1a1a24] animate-bounce"/>
                    )}
                 </button>
                 
                 {/* Leave Button */}
                 <button onClick={leaveRoom} className="p-2 md:p-4 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition flex-shrink-0 shadow-lg shadow-red-500/20">
                    <PhoneOff className="w-5 h-5"/>
                 </button>
             </div>
         </div>
      </div>
      
      {/* Sidebars and Modals */}
      <ChatSidebar 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        socket={socket} 
        roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")} 
        userName={userName}
      />

      {isLeaveModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-[#1a1a24] border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white mb-2">Leave the room?</h3>
                  <p className="text-muted-foreground text-sm mb-6">You will be disconnected from the call and return to the home page.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setIsLeaveModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl font-medium transition">Cancel</button>
                      <button onClick={confirmLeave} className="flex-1 bg-red-500 hover:bg-red-600 py-2.5 rounded-xl font-medium transition text-white shadow-lg shadow-red-500/20">Leave Room</button>
                  </div>
              </div>
          </div>
      )}

      {/* Notifications Toast */}
      <div className="fixed top-20 right-4 z-[90] flex flex-col gap-2 pointer-events-none">
          {notifications.map(n => (
              <div key={n.id} className="bg-[#1a1a24]/90 backdrop-blur border border-white/10 p-3 rounded-xl shadow-2xl text-sm animate-in slide-in-from-right-12 fade-in duration-300 max-w-xs pointer-events-auto">
                  <div className="font-bold text-primary mb-0.5 text-xs">{n.senderName}</div>
                  <div className="text-white/90 leading-tight">{n.text}</div>
              </div>
          ))}
      </div>
    </div>
  );
}
