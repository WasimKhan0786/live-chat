"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

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

    const [fit, setFit] = useState<'cover' | 'contain'>('cover');
    const [resolution, setResolution] = useState<'hd' | 'sd'>('hd');
    const [showMenu, setShowMenu] = useState(false);

    // Dynamic resolution control (Self only)
    const setVideoQuality = async (quality: 'hd' | 'sd') => {
        if (!isSelf || !stream) return;
        
        const track = stream.getVideoTracks()[0];
        if (!track) return;

        const constraints = quality === 'hd' 
            ? { width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 640 }, height: { ideal: 480 } };

        try {
            await track.applyConstraints(constraints);
            setResolution(quality);
            setShowMenu(false);
        } catch (e) {
            console.error("Resolution change failed", e);
        }
    };

    return (
        <div 
            className="relative w-full h-full bg-zinc-900 rounded-xl shadow-lg border border-white/5 group transition-all duration-300 overflow-hidden"
            onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
        >
             <video 
                ref={ref} 
                autoPlay 
                playsInline 
                muted={muted} 
                className={`w-full h-full transition-all duration-300 ${isSelf ? 'scale-x-[-1]' : ''}`}
                style={{
                    ...getFilterStyle(filter),
                    objectFit: fit
                }}
            />
            
            {/* Name Badge */}
            <div className={`absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-white transition pointer-events-none z-10 ${showMenu ? 'opacity-0' : 'opacity-100'}`}>
                {isSelf ? "You" : name}
            </div>

            {/* Status Badges */}
            <div className={`absolute top-2 right-2 flex gap-1 ${showMenu ? 'opacity-0' : ''}`}>
                 {filter !== 'none' && (
                     <div className="bg-primary/80 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-white">
                         {filter}
                     </div>
                 )}
                 {resolution === 'sd' && isSelf && (
                     <div className="bg-yellow-500/80 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-white font-bold">
                         SD
                     </div>
                 )}
            </div>

            {/* Context Menu Overlay */}
            {showMenu && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95" onClick={() => setShowMenu(false)}>
                    <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-4 w-full max-w-[200px] shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Settings</span>
                            <button onClick={() => setShowMenu(false)}><X className="w-4 h-4 text-white/50 hover:text-white"/></button>
                        </div>

                        {/* Ratio Control */}
                        <div className="space-y-2">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Frame Ratio</span>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setFit('cover')}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${fit === 'cover' ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                                >
                                    Crop
                                </button>
                                <button 
                                    onClick={() => setFit('contain')}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${fit === 'contain' ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                                >
                                    Fit
                                </button>
                            </div>
                        </div>

                        {/* Resolution Control (Self Only) */}
                        {isSelf && (
                            <div className="space-y-2">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Resolution</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setVideoQuality('hd')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${resolution === 'hd' ? 'bg-green-600 border-green-600 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                                    >
                                        HD
                                    </button>
                                    <button 
                                        onClick={() => setVideoQuality('sd')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${resolution === 'sd' ? 'bg-yellow-600 border-yellow-600 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                                    >
                                        SD
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
