"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import SimplePeer from "simple-peer";
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff, Copy, Share2, LayoutGrid, Globe, X, Search, Wand2, RefreshCw, Mic2, Users } from "lucide-react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { VideoFeed } from "@/components/video-feed"; 
import { VideoPlayer } from "@/components/video-player"; 
import { useVoiceFX, PeerData } from "@/hooks/useVoiceFX";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import { cn } from "@/lib/utils";

import { ConnectingOverlay } from "@/components/modals/ConnectingOverlay";
import { WaitingRoomOverlay } from "@/components/modals/WaitingRoomOverlay";
import { LeaveRoomModal } from "@/components/modals/LeaveRoomModal";
import { HostAdmissionModal } from "@/components/modals/HostAdmissionModal";
import { GuestJoinModal } from "@/components/modals/GuestJoinModal";
import { RoomCreatedModal } from "@/components/modals/RoomCreatedModal";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId;
  const searchParams = useSearchParams();
  const userNameParam = searchParams?.get('name');
  const [userName, setUserName] = useState<string>("");

  const router = useRouter();
  const { socket, isConnected } = useSocket();
  
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [streams, setStreams] = useState<{peerId: string, stream: MediaStream, name: string}[]>([]);
  const [sessionId, setSessionId] = useState(""); // Store persistent session ID

  useEffect(() => {
      // Create/Retrieve persistent Session ID to handle refreshes
      let sId = sessionStorage.getItem('user_session_id');
      if (!sId) {
          sId = Math.random().toString(36).substring(7);
          sessionStorage.setItem('user_session_id', sId);
      }
      setSessionId(sId);
  }, []);


  const [isChatOpen, setIsChatOpen] = useState(false);
  const [watchUrl, setWatchUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState(""); 
  const [watchMode, setWatchMode] = useState(false);
  
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false); // Enable video by default
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("none"); 
  const [useBackCamera, setUseBackCamera] = useState(false); 
  const [isFilterOpen, setIsFilterOpen] = useState(false); 
  const [isWatchOpen, setIsWatchOpen] = useState(false); 
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false); 
  // const [voiceEffect, setVoiceEffect] = useState("none"); // Moved to Hook
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  // const [hearMyself, setHearMyself] = useState(false); // Moved to Hook
  const [notifications, setNotifications] = useState<{id: string, senderName: string, text: string}[]>([]);
  const [peerFilters, setPeerFilters] = useState<Record<string, string>>({}); // Store remote filters
  const [showRoomParams, setShowRoomParams] = useState(true); // New state for room code modal
  
  // Search Hook
  const { searchResults, isSearching, searchVideos, setSearchResults } = useYouTubeSearch();

  // Host / Admin State
  const [isHost, setIsHost] = useState(false);
  const [isWaitingEntry, setIsWaitingEntry] = useState(false);
  const [joinRequests, setJoinRequests] = useState<{socketId: string, userName: string}[]>([]);
  const [isConnecting, setIsConnecting] = useState(false); // Global connection loader

  // Mini Browser State
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("https://en.wikipedia.org/wiki/Main_Page"); 
  const [tempBrowserUrl, setTempBrowserUrl] = useState("");

  const handleSearch = async () => {
      if(!watchUrl.trim()) return;
      if(watchUrl.startsWith('http')) {
          startWatchParty(); 
          return;
      }
      await searchVideos(watchUrl);
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

    // Filter Sync Listener
    const handleFilterUpdate = (userId: string, filter: string) => {
        setPeerFilters(prev => ({ ...prev, [userId]: filter }));
    };

    socket.on("receive-message", handleNewMessage);
    socket.on("browser-update", handleBrowserUpdate);
    socket.on("user-update-filter", handleFilterUpdate);

    return () => {
        socket.off("receive-message", handleNewMessage);
        socket.off("browser-update", handleBrowserUpdate);
        socket.off("user-update-filter", handleFilterUpdate);
    }
  }, [socket]);
 
  const myStreamRef = useRef<MediaStream | null>(null); // Ref to track active stream for socket callbacks
  const peersRef = useRef<PeerData[]>([]);
  const isScreenSharingRef = useRef(false);
  const stopScreenShareRef = useRef<() => void>(() => {});

  /* --- Voice FX Hook --- */
  const { voiceEffect, hearMyself, applyVoice, toggleHearMyself } = useVoiceFX(myStream, peersRef);

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
  


  useEffect(() => {
     if(userNameParam) {
         setUserName(userNameParam);
     }
     // logic removed: else { setUserName('Guest-...') } 
     // We now want to KEEP userName empty to trigger the Join Modal
  }, [userNameParam]);
  
  useEffect(() => {
    // Depend on userName state, not param
    if(!socket || !isConnected || peersRef.current.length > 0 || !userName) return; 
    
    let isMounted = true;

    const getMedia = async () => {
        try {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (e) {
            console.warn("No camera/mic found, trying audio only");
            try {
                return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            } catch (e2) {
                 console.warn("No audio found either, joining as spectator");
                 const ctx = new AudioContext();
                 const osc = ctx.createOscillator();
                 const dst = ctx.createMediaStreamDestination();
                 osc.connect(dst);
                 osc.start();
                 const track = dst.stream.getAudioTracks()[0];
                 const canvas = document.createElement("canvas");
                 canvas.width = 640; canvas.height = 480;
                 const stream = canvas.captureStream();
                 stream.addTrack(track);
                 return stream;
            }
        }
    };

    getMedia().then(stream => {
      if (!isMounted) {
          // Cleanup stream if component unmounted while initialising
          stream.getTracks().forEach(t => t.stop());
          return;
      }

      // Start with Video ON by default to resolve "Black Screen" issues
      // stream.getVideoTracks().forEach(t => t.enabled = false); 
      setMyStream(stream);
      myStreamRef.current = stream; // Keep ref in sync

      // Sanitize roomId to ensure string
      const room = Array.isArray(roomId) ? roomId[0] : (roomId || "");

      // Setup Listeners BEFORE joining to avoid race conditions
      socket.on("user-connected", (userId: string, remoteUserName: string) => {
         // Use the CURRENT active stream, not the closure 'stream' which might be stale (e.g. after camera toggle)
         const currentStream = myStreamRef.current || stream;
         const peer = createPeer(userId, socket.id, currentStream);
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
              const currentStream = myStreamRef.current || stream;
              const peer = addPeer(data.from, socket.id, data.signal, currentStream, name); 
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

      socket.on("user-toggle-audio", (userId: string, isMuted: boolean) => {
           // Handler placeholder
      });
      
      socket.on("room-full", () => {
          setIsConnecting(false);
          alert("Room limit reached (Max 10 participants). You cannot join.");
          window.location.href = '/';
      });

      socket.on("user-started-screen-share", (userId: string) => {
           if(userId !== socket.id && isScreenSharingRef.current) {
               console.log("Only one screen share allowed. Stopping my share.");
               stopScreenShareRef.current();
           }
      });

      /* --- HOST / ADMIN EVENTS --- */
      socket.on("host-update", (isHost: boolean) => {
          setIsHost(isHost);
      });

      socket.on("user-requested-join", (data: {socketId: string, userName: string}) => {
          setJoinRequests(prev => [...prev, data]);
      });

      socket.on("join-approved", (isNowHost: boolean) => {
           clearTimeout((socket as any)._connectTimeout); // Clear safety timer
           setIsWaitingEntry(false);
           setIsConnecting(false);
           if(isNowHost) setIsHost(true);
           // Proceed to join actual room
           socket.emit("join-room", room, socket.id, userName, sessionId);
      });

      socket.on("join-rejected", () => {
          setIsConnecting(false);
          alert("The host has denied your request to join.");
          window.location.href = '/';
      });

      socket.on("kicked", () => {
          setIsConnecting(false);
          alert("You have been removed from the room.");
          window.location.href = '/';
      });

      // INSTEAD of immediate join, we Request Access first
      setIsWaitingEntry(true);
      setIsConnecting(true); // START LOADING
      
      // Safety Timeout: If not connected in 15 seconds, likely server issue or network block
      const connectionTimeout = setTimeout(() => {
          setIsConnecting(false);
          alert("Connection timed out! 🕒\n\nPossible reasons:\n1. Server is waking up (Render Free Tier)\n2. Strict Network/Firewall\n\nPlease try refreshing the page.");
          window.location.reload(); 
      }, 15000);

      // Store timeout ID to clear it later (using a temp property on socket or just rely on state)
      // For simplicity in this functional component without extra refs, we'll optimistically emit.
      // *Ideal fix*: In real app, use a ref to track this timeout and clear it in 'join-approved'.
      (socket as any)._connectTimeout = connectionTimeout;

      socket.emit("request-join", room, socket.id, userName);

    }).catch(err => console.error("Media Error:", err));

    return () => {
        isMounted = false;
        socket.off("user-connected");
        socket.off("signal");
        socket.off("user-disconnected");
        socket.off("watch-mode-update");
        socket.off("user-toggle-audio"); 
        socket.off("room-full");
        socket.off("host-update");
        socket.off("user-requested-join");
        socket.off("join-approved");
        socket.off("join-rejected");
        socket.off("kicked");
        socket.off("user-started-screen-share");
    }
  }, [socket, roomId, userName, sessionId, isConnected]); // Changed userNameParam to userName

  function createPeer(userToSignal: string, callerId: string, stream: MediaStream) {
      const peer = new SimplePeer({ 
          initiator: true, 
          trickle: true, 
          stream,
          config: { 
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }, 
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ] 
          }
      });
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
      const peer = new SimplePeer({ 
          initiator: false, 
          trickle: true, 
          stream,
          config: { 
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }, 
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ] 
          }
      });
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
            // Notify peers (Optional, but good for UI)
            // socket.emit("user-toggle-audio", !audioTrack.enabled, Array.isArray(roomId) ? roomId[0] : (roomId || ""));
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
    
    // Request ONLY VIDEO to avoid interrupting the audio stream
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newMode ? "environment" : "user" }, 
        audio: false 
    }).then(videoStream => {
        const newVideoTrack = videoStream.getVideoTracks()[0];
        if(videoOff) newVideoTrack.enabled = false;
        
        // Create new combined stream with OLD audio and NEW video
        const oldAudioTrack = myStream?.getAudioTracks()[0];
        const newStream = new MediaStream([newVideoTrack]);
        if (oldAudioTrack) {
            newStream.addTrack(oldAudioTrack);
        }

        setMyStream(newStream);
        myStreamRef.current = newStream; // Update Ref

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

  // Resume AudioContext on visibility change to prevent background freezing
  useEffect(() => {
      const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // AudioContext resume handled in useVoiceFX hook
                
                // Refresh video tracks if needed
                if (myStream) {
                    const videoTrack = myStream.getVideoTracks()[0];
                    if (videoTrack && !videoTrack.enabled && !videoOff) {
                         // Attempt to re-enable if it got stuck
                         videoTrack.enabled = true;
                    }
                }
            }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [myStream, videoOff]);

  const stopScreenShare = async () => {
       setIsScreenSharing(false);
       isScreenSharingRef.current = false;
       
       try {
           const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
           const videoTrack = stream.getVideoTracks()[0];
           // Restore video state
           videoTrack.enabled = !videoOff; 

           const currentStream = myStreamRef.current;
           if(currentStream) {
               const sender = currentStream.getVideoTracks()[0];
               sender.stop();
               currentStream.removeTrack(sender);
               currentStream.addTrack(videoTrack);
               
               peersRef.current.forEach(p => {
                   if(p.peer) {
                       p.peer.replaceTrack(sender, videoTrack, currentStream);
                   }
               });
           }
       } catch(e) {
           console.error("Failed to restore camera", e);
       }
  };
  stopScreenShareRef.current = stopScreenShare;

  const toggleScreenShare = async () => {
      if (isScreenSharing) {
          stopScreenShare();
      } else {
          try {
              const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
              const screenTrack = screenStream.getVideoTracks()[0];
              
              screenTrack.onended = () => {
                   if(isScreenSharingRef.current) stopScreenShare();
              };

              const currentStream = myStreamRef.current;
              if(currentStream) {
                  const sender = currentStream.getVideoTracks()[0];
                  // Do not stop the sender track here, just remove it from stream to keep context? 
                  // If we don't stop it, camera light stays on. 
                  // But existing code didn't stop it. 
                  // I'll stick to removing it. If user wants camera off they can toggle video.
                  // Update: Actually safe to just remove.
                  
                  currentStream.removeTrack(sender);
                  currentStream.addTrack(screenTrack);
                  
                  peersRef.current.forEach(p => {
                      if(p.peer) {
                          p.peer.replaceTrack(sender, screenTrack, currentStream);
                      }
                  });
              }
              setIsScreenSharing(true);
              isScreenSharingRef.current = true;
              
              // Emit event
              const room = Array.isArray(roomId) ? roomId[0] : (roomId || "");
              socket?.emit("start-screen-share", room);

          } catch(e) {
              console.error("Screen share error", e);
          }
      }
  };

  const handleBrowserNavigate = (e?: React.FormEvent) => {
      e?.preventDefault();
      let url = tempBrowserUrl;
      if (!url.startsWith('http')) {
           // Google/Bing block iframes. Using Wikipedia as it is embeddable.
           url = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(url)}`;
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
      if(myStream) {
          myStream.getTracks().forEach(track => track.stop());
      }
      router.push('/');
      setIsLeaveModalOpen(false);
  };

  /* FILTER LOGIC */
  const applyFilter = (filter: string) => {
      setCurrentFilter(filter);
      setPeerFilters(prev => ({ ...prev, [socket?.id || 'me']: filter })); // Optimistic update
      
      const room = Array.isArray(roomId) ? roomId[0] : (roomId || "");
      if(socket && room) {
          socket.emit("update-filter", filter, room);
      }
      setIsFilterOpen(false);
  };

  const kickUser = (peerId: string) => {
      if(!isHost) return;
      if(confirm("Are you sure you want to remove this user?")) {
          socket?.emit("kick-user", peerId, Array.isArray(roomId) ? roomId[0] : (roomId || ""));
      }
  };

  const handleAdminDecision = (socketId: string, approved: boolean) => {
      setJoinRequests(prev => prev.filter(req => req.socketId !== socketId));
      socket?.emit("admin-decision", socketId, approved, Array.isArray(roomId) ? roomId[0] : (roomId || ""));
  };

  const shareRoom = async () => {
      const baseUrl = window.location.origin + window.location.pathname; 
      const text = `Join my video room on ConnectLive!\n${baseUrl}`;
       
       if (navigator.share) {
           try {
               await navigator.share({
                   title: 'Join Video Room',
                   text: 'Join my video room on ConnectLive!',
                   url: baseUrl
               });
           } catch (err) {
               // User cancelled or failed
           }
       } else {
           navigator.clipboard.writeText(text);
           alert("Link copied to clipboard! Share it on WhatsApp."); 
       }
  };

  return (
    <div className="h-screen w-full bg-[#0c0c14] text-white flex overflow-hidden">
      <div className="flex-1 flex flex-col relative">
         <div className="absolute top-0 left-0 right-0 p-3 md:p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3">
                 <button onClick={shareRoom} className="p-2 rounded-full bg-green-600/80 hover:bg-green-600 text-white backdrop-blur shadow-lg shadow-green-900/20 transition flex items-center gap-2 pr-4 pl-3">
                     <Share2 className="w-4 h-4"/>
                     <span className="text-xs font-bold">Invite</span>
                 </button>
                 
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
                    <span className="text-sm font-mono opacity-70">ID: {roomId}</span>
                    <button onClick={copyId} className="hover:text-primary"><Copy className="w-4 h-4"/></button>
                </div>
            </div>
            
             <div className="pointer-events-auto bg-red-500/20 backdrop-blur px-3 py-1 rounded-full border border-red-500/50">
                 <span className="text-sm font-mono font-medium text-white flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                     {formatTime(elapsedTime)}
                 </span>
             </div>


         </div>
         
         <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            {watchMode && activeUrl ? (
                <div className="w-full max-w-5xl aspect-video relative z-0">
                    <VideoPlayer roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")} url={activeUrl} />
                </div>
            ) : (
                <div className={cn(
                    "grid gap-3 md:gap-4 w-full h-full content-center p-2 md:p-4 overflow-y-auto",
                    (streams.length + 1) >= 3 ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pl-12 pr-12 md:px-4"
                )}>
                    <div className="aspect-video relative shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                        <VideoFeed stream={myStream} muted={true} isSelf={true} filter={currentFilter} name={userName || "You"} />
                    </div>
                    {streams.map((s) => (
                        <div key={s.peerId} className="aspect-video relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 group">
                             <VideoFeed stream={s.stream} name={s.name} filter={peerFilters[s.peerId] || 'none'} />
                             {isHost && (
                                 <button onClick={() => kickUser(s.peerId)} className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition z-20" title="Remove User">
                                     <X className="w-4 h-4" />
                                 </button>
                             )}
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

                 <button onClick={toggleCamera} className="p-2 md:p-4 rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0">
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5"/>
                 </button>
                 
                 {/* Screen Share */}
                 <button onClick={toggleScreenShare} className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", isScreenSharing ? "bg-primary shadow-lg" : "bg-white/10 hover:bg-white/20")}>
                    <Monitor className="w-4 h-4 md:w-5 md:h-5"/>
                 </button>
             </div>

             <div className="flex items-center justify-center gap-1 sm:gap-2">
                  {/* Watch Party Input Popover */}


                 {/* Mini Browser Button */}
                <div className="relative">
                    <button 
                    onClick={() => {
                        if (!isBrowserOpen) {
                            setIsWatchOpen(false);
                            setIsFilterOpen(false);
                            setIsVoiceMenuOpen(false);
                            setIsChatOpen(false);
                        }
                        setIsBrowserOpen(!isBrowserOpen);
                    }}
                    className={cn("p-2 md:p-4 rounded-full transition flex-shrink-0", isBrowserOpen ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 hover:bg-white/20")}
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
                                placeholder="Search Wikipedia..."
                                value={tempBrowserUrl}
                                onChange={(e) => setTempBrowserUrl(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1 ml-3">
                                *Note: Most sites (Google/YouTube) block external viewing. Wikipedia is supported.
                            </p>
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
                                     onClick={() => applyFilter(f)}
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
        roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")} 
        userName={userName}
      />

      <LeaveRoomModal 
          isOpen={isLeaveModalOpen} 
          onClose={() => setIsLeaveModalOpen(false)} 
          onConfirm={confirmLeave} 
      />

      <WaitingRoomOverlay isWaiting={isWaitingEntry} isConnecting={isConnecting} />

      <ConnectingOverlay isConnecting={isConnecting} />

      <HostAdmissionModal 
          isHost={isHost} 
          joinRequests={joinRequests} 
          onDecision={handleAdminDecision} 
      />

      <GuestJoinModal 
          isOpen={!userName} 
          onSubmit={setUserName} 
      />

      <RoomCreatedModal 
          isOpen={showRoomParams && !!userName} 
          onClose={() => setShowRoomParams(false)}
          roomId={Array.isArray(roomId) ? roomId[0] : (roomId || "")}
          onShare={shareRoom}
      />

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
