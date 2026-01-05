"use client";
import { useEffect, useRef } from "react";

export const VideoFeed = ({ stream, muted = false, isSelf = false, filter = "none", name = "User" }: { stream: MediaStream | null, muted?: boolean, isSelf?: boolean, filter?: string, name?: string }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const videoEl = ref.current;
        if (!videoEl || !stream) return;

        videoEl.srcObject = stream;

        const attemptPlay = () => {
            if (videoEl.paused || videoEl.ended) {
                videoEl.play().catch(e => console.log("Resume play failed", e));
            }
        };

        const onMetadata = () => attemptPlay();
        const onSuspend = () => attemptPlay();
        const onPause = () => {
             if(!videoEl.ended) attemptPlay(); 
        };
        const onStalled = () => attemptPlay();
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                attemptPlay();
            }
        };

        videoEl.onloadedmetadata = onMetadata;
        videoEl.addEventListener('suspend', onSuspend);
        videoEl.addEventListener('pause', onPause);
        videoEl.addEventListener('stalled', onStalled);
        document.addEventListener('visibilitychange', onVisibilityChange);

        // Initial Try
        attemptPlay();

        return () => {
            videoEl.removeEventListener('suspend', onSuspend);
            videoEl.removeEventListener('pause', onPause);
            videoEl.removeEventListener('stalled', onStalled);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [stream]);

    // Filter definitions
    const getFilterStyle = (f: string) => {
        switch(f) {
            case 'smooth': return { filter: 'contrast(1.2) brightness(1.2) saturate(1.1)' }; // Clean look
            case 'vivid': return { filter: 'saturate(2.0) contrast(1.15) brightness(1.1)' }; // Strong vivid
            case 'bw': return { filter: 'grayscale(1) contrast(1.2)' }; // Solid BW
            case 'sepia': return { filter: 'sepia(0.8) contrast(0.95)' }; // Distinct Sepia
            case 'vintage': return { filter: 'sepia(0.4) contrast(1.5) brightness(0.9) saturate(1.5)' }; // Intense vintage
            case 'cyber': return { filter: 'hue-rotate(180deg) saturate(2.0) contrast(1.2)' }; // Strong Cyber
            case 'cool': return { filter: 'saturate(0.2) hue-rotate(30deg) contrast(1.1) brightness(1.1)' }; 
            case 'warm': return { filter: 'sepia(0.3) saturate(1.6) contrast(1.1) brightness(1.1)' };
            case 'dim': return { filter: 'brightness(0.6) contrast(1.4) saturate(1.2)' };
            case 'invert': return { filter: 'invert(1) contrast(1.2)' };
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
