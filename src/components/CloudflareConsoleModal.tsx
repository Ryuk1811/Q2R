import React, { useEffect, useState } from 'react';
import {
  CloudflareEdgeStatus,
  getCloudflareEdgeStatus,
  getRecentEdgeTelemetry,
  STRICT_SUPPORT_EMAIL,
  TelemetryLogEntry,
} from '../services/cloudflare';

interface CloudflareConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const CloudflareConsoleModal: React.FC<CloudflareConsoleModalProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const [status, setStatus] = useState<CloudflareEdgeStatus | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [edgeStatus, logs] = await Promise.all([
        getCloudflareEdgeStatus(),
        getRecentEdgeTelemetry(),
      ]);
      setStatus(edgeStatus);
      setTelemetry(logs);
    } catch {
      onToast('Could not query system status.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#FAF8F5] border border-stone-300/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="px-6 py-5 border-b border-stone-200/80 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EBF1ED] text-[#2C3830] flex items-center justify-center text-sm font-bold border border-[#607264]/20">
              ●
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900 tracking-tight">
                  Q2R Platform &amp; Routing Status
                </h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  Global Network · 99.99% Uptime
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time performance telemetry, sub-millisecond link relays, and asset storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Dual Cards: Routing Network & Asset Vault */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* High-Speed Link Relay Card */}
            <div className="bento-card p-5 bg-white border border-[#607264]/20 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-stone-900 tracking-wide uppercase">
                    High-Speed Link Relay
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-[#EBF1ED] text-[#2C3830] rounded border border-[#607264]/30">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex justify-between border-b border-stone-100 pb-1.5">
                    <span className="text-stone-400">Network State:</span>
                    <span className="font-semibold text-stone-800">Operational</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 pb-1.5">
                    <span className="text-stone-400">Redirection Speed:</span>
                    <span className="font-semibold text-emerald-700">&lt; 15ms Sub-Millisecond</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 pb-1.5">
                    <span className="text-stone-400">Privacy Sanitization:</span>
                    <span className="font-medium text-stone-800 font-mono text-[11px]">Referrer Stripped</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Active Routing Links:</span>
                    <span className="font-bold text-stone-900 font-mono tabular-nums">
                      {status?.edge.activeLinksCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 leading-snug">
                Resolves permanent <code className="font-mono text-stone-800">/r/:slug</code> destinations globally with zero cold starts and instant Referrer protection.
              </div>
            </div>

            {/* Cloud Asset Vault Card */}
            <div className="bento-card p-5 bg-white border border-[#C88D77]/20 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-stone-900 tracking-wide uppercase">
                    Cloud Asset Vault
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-[#FAF4F0] text-[#C88D77] rounded border border-[#C88D77]/30">
                    Synchronized
                  </span>
                </div>

                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex justify-between border-b border-stone-100 pb-1.5">
                    <span className="text-stone-400">Storage Architecture:</span>
                    <span className="font-medium text-stone-800 text-[11px]">
                      Distributed Object Vault
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 pb-1.5">
                    <span className="text-stone-400">Archived QR Assets:</span>
                    <span className="font-mono text-[11px] text-stone-800 tabular-nums">
                      {status?.r2.vaultObjectsCount ?? 0} assets stored
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 pb-1.5">
                    <span className="text-stone-400">Client Memory Cache:</span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Active
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Support Despatch:</span>
                    <span className="text-[11px] font-mono text-stone-800">Direct Delivery</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 leading-snug">
                Persistent storage maintaining lossless vector QR exports, destination safety audits, and customer support ticket records.
              </div>
            </div>
          </div>

          {/* Telemetry Stream */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-stone-900">
                Recent Link Relays &amp; Route Audits
              </h4>
              <span className="text-[10px] font-mono text-stone-500 tabular-nums">
                {telemetry.length} events logged
              </span>
            </div>

            {telemetry.length === 0 ? (
              <div className="p-4 bg-white border border-stone-200 rounded-lg text-center text-xs text-stone-500">
                No recent redirect or inspection events yet. Visit any short link or run the Tree Map URL Inspector to generate telemetry.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {telemetry.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white border border-stone-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded uppercase shrink-0">
                        {t.type.replace('_', ' ')}
                      </span>
                      <span className="font-medium text-stone-900 truncate">
                        {t.targetDomain || t.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-500 shrink-0 font-mono">
                      <span>{t.trackersCleaned > 0 ? `${t.trackersCleaned} trackers stripped` : 'Clean route'}</span>
                      <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Support Channel Notice */}
          <div className="p-4 bg-stone-100/80 border border-stone-200/80 rounded-xl flex items-center justify-between text-xs text-stone-600">
            <div>
              <span className="font-semibold text-stone-900">Official Support &amp; Inquiries:</span>{' '}
              All questions routed directly to{' '}
              <a
                href={`mailto:${STRICT_SUPPORT_EMAIL}`}
                className="font-mono text-stone-900 underline font-semibold hover:text-stone-700"
              >
                {STRICT_SUPPORT_EMAIL}
              </a>
            </div>
            <a
              href={`mailto:${STRICT_SUPPORT_EMAIL}`}
              className="px-3 py-1.5 text-[11px] font-semibold bg-white border border-stone-300 rounded-md hover:border-stone-800 text-stone-800 transition-colors shrink-0"
            >
              Contact Desk →
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200/80 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 border border-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            Close Status
          </button>
        </div>
      </div>
    </div>
  );
};
