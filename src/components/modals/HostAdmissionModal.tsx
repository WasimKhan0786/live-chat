import React from 'react';
import { Users, X } from 'lucide-react';

interface JoinRequest {
    socketId: string;
    userName: string;
}

interface HostAdmissionModalProps {
    isHost: boolean;
    joinRequests: JoinRequest[];
    onDecision: (socketId: string, approved: boolean) => void;
}

export const HostAdmissionModal = ({ isHost, joinRequests, onDecision }: HostAdmissionModalProps) => {
    if (joinRequests.length === 0 || !isHost) return null;

    return (
        <div className="fixed top-24 right-4 z-[150] w-80 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-10">
            <div className="bg-primary/20 p-3 border-b border-white/5 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary"/>
                <span className="font-bold text-sm text-white">Entry Requests ({joinRequests.length})</span>
            </div>
            <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                {joinRequests.map(req => (
                    <div key={req.socketId} className="p-3 flex items-center justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-white text-sm truncate">{req.userName}</span>
                            <span className="text-[10px] text-muted-foreground">wants to join</span>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => onDecision(req.socketId, false)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition"><X className="w-4 h-4"/></button>
                            <button onClick={() => onDecision(req.socketId, true)} className="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition"><div className="w-4 h-4 rounded-full border-2 border-green-400"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
