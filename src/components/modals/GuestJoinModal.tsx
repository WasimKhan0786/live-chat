import React from 'react';
import { Users } from 'lucide-react';

interface GuestJoinModalProps {
    isOpen: boolean;
    onSubmit: (name: string) => void;
}

export const GuestJoinModal = ({ isOpen, onSubmit }: GuestJoinModalProps) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
               <div className="w-full max-w-md bg-[#1a1a24] border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 items-center text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2 ring-1 ring-primary/20">
                        <Users className="w-10 h-10 text-primary" />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-white tracking-tight">Join Room</h2>
                        <p className="text-white/40">Please enter your name to join the call.</p>
                    </div>

                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const name = formData.get('guestName') as string;
                            if(name?.trim()) {
                                onSubmit(name.trim());
                            }
                        }}
                        className="w-full space-y-4"
                    >
                        <div className="space-y-2 text-left">
                            <label className="text-xs uppercase tracking-wider font-bold text-white/40 ml-1">Display Name</label>
                            <input 
                                name="guestName"
                                autoFocus
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-lg text-white outline-none focus:ring-2 focus:ring-primary/50 transition placeholder:text-white/10"
                                placeholder="ex. Alex"
                            />
                        </div>
                        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition shadow-xl shadow-primary/20 text-lg">
                            Join Meeting
                        </button>
                    </form>

                    {/* Developer Attribution */}
                    <div className="mt-2 w-full pt-6 border-t border-white/5 flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">Developed By</span>
                        <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 font-bold text-lg tracking-wide animate-pulse">
                            Wasim Khan
                        </h3>
                        <p className="text-[10px] text-white/30 flex items-center gap-1">
                            <span>📍</span> Siwan, Bihar
                        </p>
                    </div>
               </div>
          </div>
    );
}
