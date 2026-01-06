import React from 'react';
import { Ghost, Home, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RoomInactiveModalProps {
    isOpen: boolean;
}

export const RoomInactiveModal = ({ isOpen }: RoomInactiveModalProps) => {
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
             <div className="w-full max-w-sm bg-[#1a1a24] border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 items-center text-center animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-2 ring-1 ring-red-500/20">
                      <Ghost className="w-10 h-10 text-red-500" />
                  </div>
                  
                  <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Room Expired</h2>
                      <p className="text-white/40 text-sm leading-relaxed">
                          This room is no longer active because all participants have left. Please create a new room to connect.
                      </p>
                  </div>

                  <div className="w-full space-y-3 pt-2">
                      <button 
                          onClick={() => window.location.href = '/'}
                          className="w-full bg-white text-black hover:bg-white/90 font-bold py-3.5 rounded-xl transition shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                      >
                          <Sparkles className="w-4 h-4" />
                          Create New Room
                      </button>
                      
                      <button 
                          onClick={() => window.location.href = '/'}
                          className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3.5 rounded-xl transition flex items-center justify-center gap-2"
                      >
                          <Home className="w-4 h-4" />
                          Back to Home
                      </button>
                  </div>
             </div>
        </div>
    );
};
