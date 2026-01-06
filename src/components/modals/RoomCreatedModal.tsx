import React from 'react';
import { Share2, Copy, X } from 'lucide-react';

interface RoomCreatedModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    onShare: () => void;
}

export const RoomCreatedModal = ({ isOpen, onClose, roomId, onShare }: RoomCreatedModalProps) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1a1a24] border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"/>
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition"><X className="w-5 h-5"/></button>
                
                <div className="flex flex-col items-center text-center gap-4 pt-2">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                        <Share2 className="w-8 h-8 text-primary animate-pulse"/>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Room Created!</h3>
                        <p className="text-muted-foreground text-sm">Share this code with your friends to invite them.</p>
                    </div>

                    <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3 group cursor-pointer hover:border-primary/50 transition" onClick={onShare}>
                        <code className="text-xs font-mono font-bold tracking-wider text-white break-all">
                            {typeof window !== 'undefined' ? window.location.href : roomId}
                        </code>
                        <div className="p-2 bg-white/10 rounded-lg group-hover:bg-primary group-hover:text-white transition">
                            <Copy className="w-5 h-5"/>
                        </div>
                    </div>

                    <button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-primary/25 mt-2">
                        Got it, let's go!
                    </button>
                </div>
            </div>
        </div>
    );
}
