"use client";
import { useEffect, useRef } from "react";

export const VideoFeed = ({ stream, muted = false, isSelf = false, filter = "none", name = "User" }: { stream: MediaStream | null, muted?: boolean, isSelf?: boolean, filter?: string, name?: string }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if(ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    
    // Filter definitions
    const getFilterStyle = (f: string) => {
        switch(f) {
            case 'smooth': return { filter: 'contrast(1.1) brightness(1.1) saturate(1.2) blur(0.5px)' }; // Face Smooth
            case 'vivid': return { filter: 'saturate(1.5) contrast(1.1)' };
            case 'bw': return { filter: 'grayscale(1)' };
            case 'sepia': return { filter: 'sepia(0.5)' };
            case 'vintage': return { filter: 'sepia(0.3) contrast(1.2) brightness(0.9) saturate(1.5)' }; // 1977
            case 'cyber': return { filter: 'hue-rotate(90deg) contrast(1.2)' };
            case 'cool': return { filter: 'saturate(0.5) hue-rotate(30deg) contrast(1.1)' };
            case 'warm': return { filter: 'sepia(0.2) contrast(1.1) saturate(1.4)' };
            case 'dim': return { filter: 'brightness(0.8) contrast(1.2)' };
            case 'invert': return { filter: 'invert(1)' };
            default: return {};
        }
    };

    return (
        <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-white/5 group">
             <video 
                ref={ref} 
                autoPlay 
                playsInline 
                muted={muted} 
                className={`w-full h-full object-cover transition-all duration-300 ${isSelf ? 'scale-x-[-1]' : ''}`}
                style={isSelf ? getFilterStyle(filter) : {}}
            />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
                {isSelf ? "You (" + name + ")" : name}
            </div>
            {/* Show Badge if filter is active on self */}
            {isSelf && filter !== 'none' && (
                 <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-white">
                     {filter}
                 </div>
            )}
        </div>
    )
}
