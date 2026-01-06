import React from 'react';

interface LeaveRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const LeaveRoomModal = ({ isOpen, onClose, onConfirm }: LeaveRoomModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1a1a24] border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-white mb-2">Leave the room?</h3>
                <p className="text-muted-foreground text-sm mb-6">You will be disconnected from the call and return to the home page.</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl font-medium transition">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 py-2.5 rounded-xl font-medium transition text-white shadow-lg shadow-red-500/20">Leave Room</button>
                </div>
            </div>
        </div>
    );
};
