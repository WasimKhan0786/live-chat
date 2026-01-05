"use client";
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useSocket } from "@/components/providers/socket-provider";
import dynamic from 'next/dynamic';

interface CustomPlayerProps {
    url: string;
    playing?: boolean;
    controls?: boolean;
    width?: string | number;
    height?: string | number;
    onPlay?: () => void;
    onPause?: () => void;
    onProgress?: (state: { playedSeconds: number; played: number; loaded: number; loadedSeconds: number }) => void;
    onError?: (error: any) => void;
    config?: any;
    ref?: any;
}

// Dynamically import ReactPlayer to avoid SSR/Hydration issues
const ReactPlayer = dynamic<CustomPlayerProps>(() => import('react-player').then(mod => mod.default || mod) as any, { ssr: false });

export const VideoPlayer = ({ roomId, url }: { roomId: string, url: string }) => {
    const playerRef = useRef<any>(null);
    const { socket } = useSocket();
    const [playing, setPlaying] = useState(false);
    const [isSeek, setIsSeek] = useState(false);
    
    // Prevent event loops: "Remote" updates shouldn't trigger "Local" emits
    const isRemoteUpdate = useRef(false);

    useEffect(() => {
        if(!socket) return;
        
        const handleAction = (action: any) => {
            if(action.type === 'play') {
                 // Only update if state is different to ensure callback fires, 
                 // OR if state matches but we need to ensure local consistency without trigger.
                 // Actually, if state is already 'true', React won't re-render, onPlay won't fire.
                 // So we must NOT set isRemoteUpdate=true if we are already playing.
                 setPlaying(prev => {
                     if(!prev) {
                         isRemoteUpdate.current = true;
                         return true;
                     }
                     return prev;
                 });
            }
            if(action.type === 'pause') {
                setPlaying(prev => {
                    if(prev) {
                        isRemoteUpdate.current = true;
                        return false;
                    }
                    return prev;
                });
            }
            if(action.type === 'seek') {
                setIsSeek(true);
                playerRef.current?.seekTo(action.time);
                // Seek usually triggers play.
                setPlaying(true); 
                isRemoteUpdate.current = true;
            }
        };

        socket.on("video-action", handleAction);
        
        return () => {
             socket.off("video-action", handleAction);
        }
    }, [socket]);

    // Auto-play when URL changes (e.g. selecting search result)
    useEffect(() => {
        if (url) {
            isRemoteUpdate.current = true;
            setPlaying(true);
        }
    }, [url]);
    
    const handlePlay = () => {
        if (!isRemoteUpdate.current) {
            setPlaying(true);
            socket?.emit("video-action", { type: 'play' }, roomId);
        }
        isRemoteUpdate.current = false; // Reset after handling
    };

    const handlePause = () => {
        if (!isRemoteUpdate.current) {
            setPlaying(false);
            socket?.emit("video-action", { type: 'pause' }, roomId);
        }
        isRemoteUpdate.current = false;
    };

    const handleProgress = (state: { playedSeconds: number }) => {
       // Optional: Sync time periodically? 
       // socket?.emit("video-sync", state.playedSeconds, roomId);
       if (isSeek) setIsSeek(false); // Reset seek flag
    };

    return (
        <div className="w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
            <ReactPlayer
                ref={playerRef}
                url={url}
                width="100%"
                height="100%"
                playing={playing}
                controls={true}
                onPlay={handlePlay}
                onPause={handlePause}
                onProgress={handleProgress}
                onError={(e) => { 
                    console.error("Player Error:", e);
                    // Only alert if it's a genuine playback failure (often copyright or format)
                    alert("Video Check: This video might be restricted/unplayable (Copyright or Invalid URL).");
                }}
                config={{
                    youtube: {
                        playerVars: { showinfo: 1, origin: typeof window !== 'undefined' ? window.location.origin : '' }
                    },
                    file: { 
                        attributes: { 
                            crossOrigin: "true" 
                        } 
                    }
                }}
            />
        </div>
    )
}
