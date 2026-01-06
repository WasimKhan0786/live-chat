import React from 'react';

interface WaitingRoomOverlayProps {
    isWaiting: boolean;
    isConnecting?: boolean;
}

export const WaitingRoomOverlay = ({ isWaiting, isConnecting }: WaitingRoomOverlayProps) => {
    if (!isWaiting || isConnecting) return null;
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"/>
                <h2 className="text-2xl font-bold text-white">Waiting for Host...</h2>
                <p className="text-white/50 text-sm">The host has been notified of your arrival.</p>
            </div>
        </div>
    );
};
