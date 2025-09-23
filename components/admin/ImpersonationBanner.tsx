
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { XCircleIcon } from '@heroicons/react/24/solid';

export const ImpersonationBanner: React.FC = () => {
    const { stopImpersonating, profile } = useAuth();
    
    if (!profile) return null;

    return (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-center p-2 text-sm font-semibold flex items-center justify-center gap-4 relative z-50 shadow-lg">
            <span>
                Viewing as <strong>{profile.roblox_username}</strong>
            </span>
            <button
                onClick={stopImpersonating}
                className="flex items-center gap-1.5 bg-black/20 text-white px-3 py-1 rounded-full hover:bg-black/40 transition-colors"
            >
                <XCircleIcon className="w-4 h-4"/>
                <span>Exit View</span>
            </button>
        </div>
    );
}
