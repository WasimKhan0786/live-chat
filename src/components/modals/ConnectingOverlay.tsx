import React from 'react';

export const ConnectingOverlay = ({ isConnecting }: { isConnecting: boolean }) => {
    if(!isConnecting) return null;
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[210] flex items-center justify-center p-4">
           <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-primary animate-spin"/>
               <span className="text-white font-medium animate-pulse">Connecting to room...</span>
           </div>
       </div>
    );
}
