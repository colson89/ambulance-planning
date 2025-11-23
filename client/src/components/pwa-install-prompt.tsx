import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { showInstallPrompt, isInstalled } from '@/utils/pwa';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    setIsAppInstalled(isInstalled());

    // Listen for install availability
    const handleInstallAvailable = () => {
      if (!isInstalled()) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setShowPrompt(false);
      setIsAppInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isAppInstalled || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="border-primary shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Installeer de App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Installeer APK Planning voor snelle toegang en offline gebruik
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleInstall} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Installeren
          </Button>
          <Button variant="outline" onClick={handleDismiss}>
            Later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Compact version for header/navbar
export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    setIsAppInstalled(isInstalled());

    const handleInstallAvailable = () => {
      if (!isInstalled()) {
        setCanInstall(true);
      }
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setCanInstall(false);
      setIsAppInstalled(true);
    }
  };

  if (isAppInstalled || !canInstall) {
    return null;
  }

  return (
    <Button variant="outline" size="sm" onClick={handleInstall}>
      <Download className="mr-2 h-4 w-4" />
      App Installeren
    </Button>
  );
}
