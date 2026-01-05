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

    const [zoom, setZoom] = useState(1); // Video Zoom (Internal)
    const [size, setSize] = useState(1); // Container Size (Visual scale)
    const [showControls, setShowControls] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleStart = () => {
        longPressTimerRef.current = setTimeout(() => {
            setShowControls(true);
        }, 500); // 500ms long press
    };

    const handleEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    };

    return (
        <div 
            className="relative w-full h-full bg-zinc-900 rounded-xl shadow-lg border border-white/5 group transition-all duration-300 z-0 hover:z-20"
            style={{ transform: `scale(${size})`, transformOrigin: 'center' }}
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onContextMenu={(e) => { e.preventDefault(); setShowControls(true); }} // Right click to open
        >
             <video 
                ref={ref} 
                autoPlay 
                playsInline 
                muted={muted} 
                className={`w-full h-full object-cover transition-transform duration-200 ${isSelf ? 'scale-x-[-1]' : ''}`}
                style={{
                    ...getFilterStyle(filter), // Apply filter to everyone
                    transform: `${isSelf ? 'scaleX(-1)' : ''} scale(${zoom})` // Combine mirror and zoom
                }}
            />
            
            {/* Name Badge */}
            <div className={`absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white transition pointer-events-none ${showControls ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                {isSelf ? "You (" + name + ")" : name}
            </div>

            {/* Filter Badge */}
            {filter !== 'none' && (
                 <div className={`absolute top-2 right-2 bg-primary/80 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-white ${showControls ? 'opacity-0' : ''}`}>
                     {filter}
                 </div>
            )}

            {/* Customization Overlay */}
            {showControls && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 p-4 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between w-full items-center mb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Customize View</span>
                        <button onClick={() => setShowControls(false)} className="text-white/50 hover:text-white"><X className="w-4 h-4"/></button>
                    </div>

                    {/* Zoom Slider */}
                    <div className="w-full space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Zoom</span>
                            <span>{Math.round(zoom * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="3" 
                            step="0.1" 
                            value={zoom} 
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    {/* Size Slider */}
                    <div className="w-full space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Size</span>
                            <span>{Math.round(size * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="1.5" 
                            step="0.1" 
                            value={size} 
                            onChange={(e) => setSize(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <button 
                        onClick={() => { setZoom(1); setSize(1); }}
                        className="mt-2 text-[10px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white transition"
                    >
                        Reset All
                    </button>
                </div>
            )}
        </div>
    )
}
