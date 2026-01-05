"use client";
import { useEffect, useRef } from "react";

export const VideoFeed = ({ stream, muted = false, isSelf = false, filter = "none", name = "User" }: { stream: MediaStream | null, muted?: boolean, isSelf?: boolean, filter?: string, name?: string }) => {
    const ref = useRef<HTMLVideoElement>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    useEffect(() => {
        const videoEl = ref.current;
        if (!videoEl || !stream) return;

        videoEl.srcObject = stream;

        // Check initial state of video track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
             setIsVideoEnabled(videoTrack.enabled);
             
             const handleEnabled = () => setIsVideoEnabled(true);
             const handleDisabled = () => setIsVideoEnabled(false);
             
             // Listen for "mute" (no data) vs "unmute" (data flowing) 
             // Note: In WebRTC, 'mute' often means the remote side stopped sending (e.g. disabled track)
             videoTrack.addEventListener('enabled', handleEnabled); // Custom events if we manually dispatch?
             // Standard track events
             videoTrack.onmute = () => setIsVideoEnabled(false);
             videoTrack.onunmute = () => setIsVideoEnabled(true);
             // Also check the .enabled property which we toggle manually
             const interval = setInterval(() => {
                 if (videoTrack.enabled !== isVideoEnabled) setIsVideoEnabled(videoTrack.enabled);
             }, 500); // Polling as a backup for state sync

             return () => {
                 clearInterval(interval);
                 videoTrack.onmute = null;
                 videoTrack.onunmute = null;
             };
        }
    }, [stream]);
    
    // Play attempt logic
    useEffect(() => {
        const videoEl = ref.current;
        if(!videoEl || !stream) return;
        
        const attemptPlay = async () => {
            try {
                if (videoEl.paused) {
                    await videoEl.play();
                }
            } catch (e) {
                console.warn("Autoplay blocked/failed", e);
            }
        };
        
        attemptPlay();
        // Retry on interaction or visibility
        const onVisibility = () => { if(!document.hidden) attemptPlay(); };
        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('click', attemptPlay);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('click', attemptPlay);
        }
    }, [stream]);

    // Filter definitions
    const getFilterStyle = (f: string) => {
        switch(f) {
            case 'smooth': return { filter: 'contrast(1.2) brightness(1.2) saturate(1.1)' }; 
            case 'vivid': return { filter: 'saturate(2.0) contrast(1.15) brightness(1.1)' }; 
            case 'bw': return { filter: 'grayscale(1) contrast(1.2)' }; 
            case 'sepia': return { filter: 'sepia(0.8) contrast(0.95)' }; 
            case 'vintage': return { filter: 'sepia(0.4) contrast(1.5) brightness(0.9) saturate(1.5)' }; 
            case 'cyber': return { filter: 'hue-rotate(180deg) saturate(2.0) contrast(1.2)' }; 
            case 'cool': return { filter: 'saturate(0.2) hue-rotate(30deg) contrast(1.1) brightness(1.1)' }; 
            case 'warm': return { filter: 'sepia(0.3) saturate(1.6) contrast(1.1) brightness(1.1)' };
            case 'dim': return { filter: 'brightness(0.6) contrast(1.4) saturate(1.2)' };
            case 'invert': return { filter: 'invert(1) contrast(1.2)' };
            default: return {};
        }
    };

    return (
        <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-white/5 group">
             {isVideoEnabled ? (
                 <video 
                    ref={ref} 
                    autoPlay 
                    playsInline 
                    muted={muted} 
                    className={`w-full h-full object-cover transition-all duration-300 ${isSelf ? 'scale-x-[-1]' : ''}`}
                    style={isSelf ? getFilterStyle(filter) : {}}
                />
             ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-muted-foreground">
                     <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2 animate-pulse">
                         <span className="text-2xl font-bold uppercase">{name.charAt(0)}</span>
                     </div>
                     <span className="text-xs">Camera Off</span>
                 </div>
             )}
             
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
                {isSelf ? "You (" + name + ")" : name}
            </div>
            {isSelf && filter !== 'none' && (
                 <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-white">
                     {filter}
                 </div>
            )}
        </div>
    )
}
