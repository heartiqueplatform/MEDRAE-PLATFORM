"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export function PWAInstallBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        const handleInstallReady = (e: any) => {
            setInstallPrompt(e.detail.prompt);
            setShowBanner(true);
        };

        window.addEventListener('pwa-install-ready', handleInstallReady);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowBanner(false);
        }

        return () => {
            window.removeEventListener('pwa-install-ready', handleInstallReady);
        };
    }, []);

    const handleInstall = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    setShowBanner(false);
                }
                setInstallPrompt(null);
            });
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwaInstallDismissed', 'true');
    };

    useEffect(() => {
        const dismissed = localStorage.getItem('pwaInstallDismissed');
        if (dismissed === 'true') {
            setShowBanner(false);
        }
    }, []);

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 p-4 bg-blue-50 border border-blue-200 rounded-2xl shadow-xl animate-slide-up">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">
                        Install Medrae
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5">
                        Install Medrae on your device for a faster, offline-ready experience.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <Button
                            size="sm"
                            onClick={handleInstall}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-auto rounded-lg"
                        >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Install
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDismiss}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 text-xs px-3 py-1.5 h-auto rounded-lg"
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                >
                    <X className="h-4 w-4 text-blue-600" />
                </button>
            </div>
        </div>
    );
}