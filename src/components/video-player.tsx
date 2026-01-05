"use client";
import ReactPlayer from 'react-player';
import { useEffect, useRef, useState } from 'react';
import { useSocket } from "@/components/providers/socket-provider";

export const VideoPlayer = ({ roomId, url }: { roomId: string, url: string }) => {
    const playerRef = useRef<ReactPlayer>(null);
    const { socket } = useSocket();
    const [playing, setPlaying] = useState(false);
    
    useEffect(() => {
        if(!socket) return;
        
        const handleAction = (action: any) => {
            console.log("Video Action:", action);
            if(action.type === 'play') setPlaying(true);
            if(action.type === 'pause') setPlaying(false);
            if(action.type === 'seek') {
                setPlaying(true); // Auto play on seek usually
                playerRef.current?.seekTo(action.time);
            }
        };

        socket.on("video-action", handleAction);
        
        return () => {
             socket.off("video-action", handleAction);
        }
    }, [socket]);
    
    // We only emit if initiated by user. ReactPlayer callbacks fire on event.
    // To avoid loops (receiving 'play' -> calling setPlaying(true) -> onPlay fires -> emit 'play'),
    // we need to differentiate user action. 
    // Usually ReactPlayer doesn't distinguish. 
    // A simple guard: if already playing, don't emit.
    
    const handlePlay = () => {
        if(!playing) {
             setPlaying(true);
             socket?.emit("video-action", { type: 'play' }, roomId);
        }
    }
    
    const handlePause = () => {
        if(playing) {
             setPlaying(false);
             socket?.emit("video-action", { type: 'pause' }, roomId);
        }
    }
    
    const handleSeek = (seconds: number) => {
         // This is tricky as seek involves dragging.
         // Better to listen to onSeek? onSeek only gives seconds.
         socket?.emit("video-action", { type: 'seek', time: seconds }, roomId);
    }
    
    // Note: This naive logic works for basic sync. For production sync, time updates are needed.

    return (
        <div className="w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
            <ReactPlayer 
                ref={playerRef as any}
                url={url}
                width="100%"
                height="100%"
                playing={playing}
                controls={true}
                onPlay={() => { setPlaying(true); socket?.emit("video-action", { type: 'play' }, roomId); }}
                onPause={() => { setPlaying(false); socket?.emit("video-action", { type: 'pause' }, roomId); }}
                // onSeek={handleSeek} // onSeek is not always reliably "user" only. 
            />
        </div>
    )
}
