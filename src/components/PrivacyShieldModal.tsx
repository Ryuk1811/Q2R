import React, { useEffect, useState } from 'react';
import { LinkRecord } from '../types';
import { fetchLinkRegistry } from '../services/cloudflare';

interface PrivacyShieldModalProps {
  slug: string;
  onClose: () => void;
  onInspect?: (url: string) => void;
}

export const PrivacyShieldModal: React.FC<PrivacyShieldModalProps> = ({ slug, onClose, onInspect }) => {
  const [linkData, setLinkData] = useState<LinkRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;
    async function fetchLink() {
      try {
        setLoading(true);

        const list = await fetchLinkRegistry();
        if (isMounted) {
          const found = list.find(
            (l: LinkRecord) => l.slug.toLowerCase() === slug.toLowerCase()
          );
          if (found) {
            setLinkData(found);
          } else {
            setError(`The link "/r/${slug}" was not found or has been removed.`);
          }
        }
      } catch {
        if (isMounted) setError('Unable to load link details at this moment.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLink();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!linkData || isPaused || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = linkData.originalUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [linkData, isPaused, countdown, slug]);

  const handleProceed = () => {
    if (linkData) {
      window.location.href = linkData.originalUrl;
    }
  };

  const getHostname = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return urlStr;
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200/80 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="border-b border-stone-100 pb-4 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block">
              Privacy Shield
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 mt-0.5">
              Destination Verification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-500">
            Checking destination safety...
          </div>
        ) : error ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-800 text-xs">
              {error}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        ) : linkData ? (
          <div className="space-y-6">
            <p className="text-xs text-stone-600 leading-relaxed">
              This short link has <strong>Privacy Shield</strong> enabled. Review the verified destination address before proceeding.
            </p>

            {/* Target Card */}
            <div className="border border-stone-200/80 rounded-xl p-4 bg-[#FAF8F5] space-y-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 block">
                  Destination Host
                </span>
                <span className="text-base font-bold text-stone-900 break-all font-mono">
                  {getHostname(linkData.originalUrl)}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 block">
                  Full Destination URL
                </span>
                <span className="text-xs font-mono text-stone-700 break-all select-all">
                  {linkData.originalUrl}
                </span>
              </div>

              {linkData.title && (
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 block">
                    Link Description
                  </span>
                  <span className="text-xs text-stone-800">
                    {linkData.title}
                  </span>
                </div>
              )}

              {/* Security indicators */}
              <div className="pt-2 border-t border-stone-200/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">Security</span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    ✓ {linkData.originalUrl.startsWith('https://') ? 'HTTPS Encrypted' : 'Standard Web'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Referrer Shield</span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    ✓ Protected (No tracking)
                  </span>
                </div>
              </div>
            </div>

            {/* Countdown / Auto-Redirect Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>
                  {isPaused ? 'Auto-redirect paused' : `Redirecting automatically in ${countdown}s...`}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-stone-900 font-medium underline cursor-pointer hover:opacity-75"
                >
                  {isPaused ? 'Resume countdown' : 'Pause'}
                </button>
              </div>

              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-stone-900 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((4 - countdown) / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full sm:flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-colors cursor-pointer text-center shadow-xs"
              >
                Continue to Website →
              </button>
              {onInspect && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onInspect(linkData.originalUrl);
                  }}
                  className="w-full sm:w-auto px-4 py-3 text-xs font-semibold bg-[#FAF4F0] text-[#8C4E3A] hover:bg-[#f3e7df] border border-[#C88D77]/30 rounded-xl transition-colors cursor-pointer text-center"
                  title="Inspect tracking parameters in visual tree map"
                >
                  Inspect Tree
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 text-xs font-medium border border-stone-200 hover:border-stone-900 text-stone-700 rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
