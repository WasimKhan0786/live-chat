"use client";
import { useEffect, useRef, useState } from 'react';
import { useSocket } from "@/components/providers/socket-provider";
import dynamic from 'next/dynamic';

// Dynamically import ReactPlayer to avoid SSR/Hydration issues
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

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
                isRemoteUpdate.current = true;
                setPlaying(true);
            }
            if(action.type === 'pause') {
                isRemoteUpdate.current = true;
                setPlaying(false);
            }
            if(action.type === 'seek') {
                setIsSeek(true);
                playerRef.current?.seekTo(action.time);
                isRemoteUpdate.current = true;
                setPlaying(true); // Usually auto-play after seek
            }
        };

        socket.on("video-action", handleAction);
        
        return () => {
             socket.off("video-action", handleAction);
        }
    }, [socket]);
    
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
                onError={(e) => console.error("Player Error:", e)}
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
