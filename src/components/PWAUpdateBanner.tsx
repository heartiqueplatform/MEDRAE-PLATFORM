"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdateBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        const handleUpdateAvailable = () => {
            setUpdateAvailable(true);
            setShowBanner(true);
        };

        const handleOfflineReady = () => {
            console.log('Offline ready');
        };

        window.addEventListener('pwa-update-available', handleUpdateAvailable);
        window.addEventListener('pwa-offline-ready', handleOfflineReady);

        const pending = (window as any).__pwa?.getUpdateStatus?.();
        if (pending) {
            setUpdateAvailable(true);
            setShowBanner(true);
        }

        return () => {
            window.removeEventListener('pwa-update-available', handleUpdateAvailable);
            window.removeEventListener('pwa-offline-ready', handleOfflineReady);
        };
    }, []);

    const handleUpdate = () => {
        if ((window as any).__pwa) {
            (window as any).__pwa.updateApp();
            setShowBanner(false);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        if ((window as any).__pwa) {
            (window as any).__pwa.clearUpdateStatus();
        }
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-xl animate-slide-up">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">
                        Update Available
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                        A new version of Medrae is ready. Get the latest features and fixes.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <Button
                            size="sm"
                            onClick={handleUpdate}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 h-auto rounded-lg"
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Update Now
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDismiss}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 text-xs px-3 py-1.5 h-auto rounded-lg"
                        >
                            Later
                        </Button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-amber-100 rounded-lg transition-colors flex-shrink-0"
                >
                    <X className="h-4 w-4 text-amber-600" />
                </button>
            </div>
        </div>
    );
}