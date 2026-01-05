"use client";
import { useEffect, useRef } from "react";

export const VideoFeed = ({ stream, muted = false, isSelf = false }: { stream: MediaStream | null, muted?: boolean, isSelf?: boolean }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if(ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    
    return (
        <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-white/5 group">
             <video 
                ref={ref} 
                autoPlay 
                playsInline 
                muted={muted} 
                className={`w-full h-full object-cover ${isSelf ? 'scale-x-[-1]' : ''}`} 
            />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition">
                {isSelf ? "You" : "User"}
            </div>
        </div>
    )
}
