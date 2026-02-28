import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Share, MoreVertical, Check, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 animate-[glow-pulse_8s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 20% 10%, hsl(210 100% 50% / 0.15) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 animate-[glow-pulse_10s_ease-in-out_2s_infinite]"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 80% 90%, hsl(42 90% 52% / 0.15) 0%, transparent 55%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full space-y-8"
      >
        {/* App icon */}
        <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
          <img src="/pwa-512.png" alt="Anshify" className="w-full h-full object-cover" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Install Anshify</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Get the full app experience — no URL bar, instant launch from your home screen
          </p>
        </div>

        {isInstalled ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Check className="h-6 w-6" />
              <span className="text-lg font-bold">Already Installed!</span>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Open App
            </Button>
          </motion.div>
        ) : isIOS ? (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5 text-left space-y-4">
              <h3 className="font-bold text-foreground text-sm">Install on iPhone / iPad:</h3>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">1</div>
                <p className="text-sm text-muted-foreground">Tap the <Share className="inline h-4 w-4 text-blue-400" /> <strong className="text-foreground">Share</strong> button in Safari's bottom bar</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">2</div>
                <p className="text-sm text-muted-foreground">Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">3</div>
                <p className="text-sm text-muted-foreground">Tap <strong className="text-foreground">"Add"</strong> — done!</p>
              </div>
            </div>
          </div>
        ) : deferredPrompt ? (
          <Button onClick={handleInstall} size="lg" className="w-full text-base font-bold gap-2">
            <Download className="h-5 w-5" /> Install Now
          </Button>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5 text-left space-y-4">
              <h3 className="font-bold text-foreground text-sm">Install on Android / Desktop:</h3>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">1</div>
                <p className="text-sm text-muted-foreground">Tap the <MoreVertical className="inline h-4 w-4 text-foreground" /> <strong className="text-foreground">menu</strong> (three dots) in Chrome</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">2</div>
                <p className="text-sm text-muted-foreground">Tap <strong className="text-foreground">"Install app"</strong> or <strong className="text-foreground">"Add to Home screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">3</div>
                <p className="text-sm text-muted-foreground">Confirm — the app launches without a URL bar!</p>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: Smartphone, label: 'Full Screen' },
            { icon: Download, label: 'Works Offline' },
            { icon: Check, label: 'No URL Bar' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="h-10 w-10 rounded-xl bg-secondary/60 flex items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <button onClick={() => navigate('/')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip for now
        </button>
      </motion.div>
    </div>
  );
};

export default InstallPage;
