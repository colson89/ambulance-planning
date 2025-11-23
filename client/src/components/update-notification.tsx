import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, X } from 'lucide-react';

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      // Check for updates every 60 seconds
      const interval = setInterval(() => {
        reg.update();
      }, 60 * 1000);

      // Listen for waiting service worker
      const checkForUpdate = () => {
        if (reg.waiting) {
          console.log('[UpdateNotification] New version available');
          setShowUpdate(true);
        }
      };

      // Check immediately
      checkForUpdate();

      // Listen for state changes
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[UpdateNotification] New version installed');
              setShowUpdate(true);
            }
          });
        }
      });

      return () => clearInterval(interval);
    });

    // Listen for controller change (new SW took over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[UpdateNotification] Reloading after update');
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert className="bg-blue-50 border-blue-200">
        <RefreshCw className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 font-semibold">
          Nieuwe Versie Beschikbaar
        </AlertTitle>
        <AlertDescription className="text-blue-800 mt-2">
          Er is een nieuwe versie van de applicatie beschikbaar. Herlaad de pagina om de nieuwste functies en verbeteringen te krijgen.
        </AlertDescription>
        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleUpdate}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Nu Herladen
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <X className="h-3 w-3 mr-1" />
            Later
          </Button>
        </div>
      </Alert>
    </div>
  );
}
