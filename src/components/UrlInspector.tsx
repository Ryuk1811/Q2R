import React, { useEffect, useState } from 'react';
import { UrlInspectionResult } from '../types';

interface UrlInspectorProps {
  initialUrl?: string;
  onSendToQR: (url: string) => void;
  onSendToShorten: (url: string) => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

interface StoredHistoryItem {
  url: string;
  timestamp: number;
  domain: string;
  hasTracking: boolean;
  clicks?: number;
}

const STORAGE_KEY = 'quickrelease_recent_inspections';

export const UrlInspector: React.FC<UrlInspectorProps> = ({
  initialUrl = '',
  onSendToQR,
  onSendToShorten,
  onToast,
}) => {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UrlInspectionResult | null>(null);
  const [history, setHistory] = useState<StoredHistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'clean' | 'utm' | 'trackers'>('all');

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveToHistory = (item: StoredHistoryItem) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.url.toLowerCase() !== item.url.toLowerCase());
        const updated = [item, ...filtered].slice(0, 6);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore
    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
      onToast('Inspection history cleared.', 'info');
    } catch {
      // Ignore
    }
  };

  const removeHistoryItem = (urlToRemove: string) => {
    try {
      setHistory((prev) => {
        const updated = prev.filter((h) => h.url !== urlToRemove);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore
    }
  };

  const handleInspect = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const target = customUrl !== undefined ? customUrl : urlInput;
    if (!target.trim()) {
      onToast('Please enter a shortened URL or web link to inspect.', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/inspect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target.trim() }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const data: UrlInspectionResult = json.data;
        setResult(data);
        saveToHistory({
          url: target.trim(),
          timestamp: Date.now(),
          domain: data.domain || 'Direct Link',
          hasTracking: data.hasTracking,
          clicks: data.internalStats?.clicks,
        });
        onToast('Visual route tree map generated.', 'success');
      } else {
        onToast(json.error || 'Failed to inspect this link.', 'error');
      }
    } catch {
      onToast('Network error while resolving URL redirect hops.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-inspect if initialUrl is passed
  useEffect(() => {
    if (initialUrl && initialUrl.trim()) {
      setUrlInput(initialUrl);
      handleInspect(undefined, initialUrl);
    }
  }, [initialUrl]);

  const handleCopy = async (text: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(`${label} to clipboard`, 'success');
    } catch {
      onToast('Could not copy to clipboard', 'error');
    }
  };

  // Platform mapping for ad trackers
  const getTrackerInfo = (key: string): { label: string; network: string } => {
    const k = key.toLowerCase();
    if (k === 'gclid') return { label: 'Google Ads Click ID', network: 'Google Marketing Platform' };
    if (k === 'fbclid') return { label: 'Meta Click ID', network: 'Meta / Facebook Pixel' };
    if (k === 'ttclid') return { label: 'TikTok Click ID', network: 'ByteDance Ads' };
    if (k === 'msclkid') return { label: 'Microsoft Click ID', network: 'Bing Ads' };
    if (k === 'twclid') return { label: 'X / Twitter Click ID', network: 'X Ads' };
    if (k === 'dclid') return { label: 'DoubleClick ID', network: 'Google Display Network' };
    if (k === 'irclickid') return { label: 'Impact Radius ID', network: 'Impact Affiliate' };
    if (k === 'mc_eid' || k === 'mc_cid') return { label: 'Mailchimp ID', network: 'Intuit Mailchimp' };
    if (k === 'ref' || k === 'referrer') return { label: 'Referrer Token', network: 'Traffic Referrer' };
    return { label: 'Ad Platform Token', network: 'Analytics Tracker' };
  };

  // Calculate Treemap Breakdown
  const calculateTreemap = (data: UrlInspectionResult) => {
    const totalLen = Math.max(1, data.finalUrl.length);
    const domainLen = data.domain.length + 8; // approx protocol + domain
    const cleanPathLen = Math.max(0, data.cleanUrl.length - domainLen);
    const utmCount = Object.keys(data.utmParams).length;
    const trackerCount = Object.keys(data.trackingParams).length;
    const queryCount = Object.keys(data.queryParams).length;

    const utmLen = Object.entries(data.utmParams).reduce((acc, [k, v]) => acc + k.length + v.length + 2, 0);
    const trackerLen = Object.entries(data.trackingParams).reduce((acc, [k, v]) => acc + k.length + v.length + 2, 0);
    const functionalQueryLen = Object.entries(data.queryParams).reduce((acc, [k, v]) => acc + k.length + v.length + 2, 0);

    const domainPct = Math.round((domainLen / totalLen) * 100);
    const pathPct = Math.round((cleanPathLen / totalLen) * 100);
    const queryPct = Math.round((functionalQueryLen / totalLen) * 100);
    const trackingPct = Math.max(0, 100 - (domainPct + pathPct + queryPct));

    return {
      domainPct: Math.max(15, domainPct),
      pathPct: Math.max(10, pathPct),
      queryPct: Math.max(0, queryPct),
      trackingPct: data.hasTracking ? Math.max(10, trackingPct) : 0,
      utmCount,
      trackerCount,
      queryCount,
    };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-stone-200/70 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1.5 font-medium">
            <span>Universal Inspector</span>
            <span aria-hidden="true">·</span>
            <span>Zero Sign-Up Required</span>
            <span aria-hidden="true">·</span>
            <span>Visual Route Tree</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Link &amp; Tracking Tree Map
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">
            Trace redirect hops, unpack marketing campaign parameters, and inspect spyware tokens across any link on the internet.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-600 bg-white px-3.5 py-2 rounded-xl border border-stone-200/80 shadow-2xs shrink-0">
          <span className="font-semibold text-stone-900">Universal Coverage:</span>
          <span>Bitly, TinyURL, t.co, or Q2R</span>
        </div>
      </div>

      {/* Input Search Card */}
      <div className="bento-card p-6 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
          Enter any shortened link or full URL
        </label>
        <form onSubmit={handleInspect} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste link (e.g. bit.ly/3xyz, /r/slug, or full URL with UTMs)"
                className="w-full px-4 py-2.5 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 placeholder:text-stone-400 min-w-0"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs cursor-pointer p-1"
                  title="Clear input"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors rounded-xl cursor-pointer shrink-0 disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mapping Tree...</span>
                </>
              ) : (
                <span>Build Tree Map →</span>
              )}
            </button>
          </div>

          {/* Preload Inspection Profiles */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 pt-1">
            <span className="text-stone-400 text-[11px]">Preload Profiles:</span>
            <button
              type="button"
              onClick={() => {
                const target = 'https://workspace.google.com/solutions/enterprise?utm_source=partner_digest&utm_medium=email&utm_campaign=q4_launch&ref=quickrelease';
                setUrlInput(target);
                handleInspect(undefined, target);
              }}
              className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-lg transition-colors cursor-pointer font-mono text-[11px] border border-stone-200"
            >
              Enterprise Marketing Campaign (UTMs)
            </button>
            <button
              type="button"
              onClick={() => {
                const target = 'https://store.shopify.com/products/catalog?utm_source=google&utm_medium=cpc&gclid=Cj0KCQjwmv65BhD8ARIsA0Ek69z';
                setUrlInput(target);
                handleInspect(undefined, target);
              }}
              className="px-2.5 py-1 bg-[#FAF4F0] hover:bg-[#f3e7df] text-[#8C4E3A] rounded-lg transition-colors cursor-pointer font-mono text-[11px] border border-[#C88D77]/20"
            >
              E-Commerce Ad Attribution (gclid)
            </button>
          </div>
        </form>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bento-card p-12 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
          <p className="text-xs font-mono text-stone-500">
            Resolving redirect gateways and isolating tracking parameters...
          </p>
        </div>
      )}

      {/* VISUAL TREE MAP PRESENTATION */}
      {result && (
        <div className="space-y-6 animate-in fade-in">
          {/* VISUAL TREEMAP PROPORTIONAL COMPONENT BAR */}
          {(() => {
            const tm = calculateTreemap(result);
            return (
              <div className="bento-card p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-stone-900">
                    URL Payload Composition Treemap
                  </span>
                  <div className="flex items-center gap-4 text-[11px] text-stone-500">
                    <span>Clean Core: <strong className="text-stone-900">{100 - tm.trackingPct}%</strong></span>
                    {result.hasTracking && (
                      <span>Tracking Overhead: <strong className="text-amber-700">{tm.trackingPct}%</strong></span>
                    )}
                  </div>
                </div>

                {/* Proportional Segmented Treemap Bar */}
                <div className="h-6 w-full rounded-lg overflow-hidden flex border border-stone-200/80 bg-stone-100 text-[10px] font-mono font-semibold">
                  <div
                    style={{ width: `${tm.domainPct}%` }}
                    className="bg-[#2C3830] text-white flex items-center justify-center truncate px-2"
                    title={`Domain: ${result.domain}`}
                  >
                    Host ({tm.domainPct}%)
                  </div>
                  <div
                    style={{ width: `${tm.pathPct}%` }}
                    className="bg-[#607264] text-white flex items-center justify-center truncate px-2"
                    title="Path Structure"
                  >
                    Path ({tm.pathPct}%)
                  </div>
                  {tm.queryCount > 0 && (
                    <div
                      style={{ width: `${tm.queryPct}%` }}
                      className="bg-stone-300 text-stone-800 flex items-center justify-center truncate px-2"
                      title="Functional Query Params"
                    >
                      Params
                    </div>
                  )}
                  {result.hasTracking && (
                    <div
                      style={{ width: `${tm.trackingPct}%` }}
                      className="bg-[#C88D77] text-white flex items-center justify-center truncate px-2"
                      title="Trackers & UTM Tags"
                    >
                      Trackers ({tm.trackingPct}%)
                    </div>
                  )}
                </div>

                {/* Filter Pills for the tree */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-stone-400 text-[11px]">Filter branch view:</span>
                  {[
                    { id: 'all', label: 'Complete Tree' },
                    { id: 'clean', label: 'Clean Destination' },
                    { id: 'utm', label: `UTM Tags (${tm.utmCount})` },
                    { id: 'trackers', label: `Ad Tokens (${tm.trackerCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        activeFilter === f.id
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-[#F5F3EF] text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* VISUAL HIERARCHICAL TREE MAP CONTAINER */}
          <div className="bento-card p-6 md:p-8 space-y-6 bg-white border border-stone-200/90 shadow-xs relative">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Hierarchical Route &amp; Parameter Tree
              </span>
              <div className="flex items-center gap-3 text-xs text-stone-500 font-mono">
                <span className="hidden sm:inline text-[#2C3830] bg-[#EBF1ED] px-2 py-0.5 rounded text-[10px] font-semibold border border-[#607264]/30">
                  ☁ Verified Route Telemetry
                </span>
                <span>Total Hops: <strong className="text-stone-900">{result.hops.length}</strong></span>
                <span>·</span>
                <span>Security: <strong className="text-stone-900">{result.isHttps ? 'HTTPS' : 'HTTP'}</strong></span>
              </div>
            </div>

            {/* THE VISUAL TREE NODES */}
            <div className="space-y-6 max-w-3xl mx-auto pt-2">
              {/* NODE 1: TREE ROOT (ORIGIN QUERY) */}
              {(activeFilter === 'all' || activeFilter === 'clean') && (
                <div className="relative pl-8">
                  {/* Vertical connecting branch */}
                  <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-stone-300" />

                  {/* Root Node Bullet */}
                  <div className="absolute left-1.5 top-2.5 w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                    1
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-stone-700">Root Input Link</span>
                      <span className="font-mono text-[11px] text-stone-500">
                        {result.isInternal ? 'Platform Short Link' : 'External Web URL'}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-stone-900 break-all select-all font-medium">
                      {result.inputUrl}
                    </div>
                  </div>
                </div>
              )}

              {/* NODE 2: INTERMEDIATE REDIRECT HOPS */}
              {(activeFilter === 'all' || activeFilter === 'clean') && result.hops.length > 1 && (
                <div className="relative pl-8 space-y-3">
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-stone-300" />

                  {result.hops.slice(0, -1).map((hop, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-amber-600" />

                      <div className="p-3 rounded-xl bg-white border border-stone-200 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span className="font-semibold text-amber-800">
                            Hop {hop.step}: {hop.type}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold text-[10px]">
                            HTTP {hop.status}
                          </span>
                        </div>
                        <div className="text-stone-600 break-all text-[11px]" title={hop.url}>
                          {hop.url}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NODE 3: DESTINATION CROWN NODE */}
              {(activeFilter === 'all' || activeFilter === 'clean') && (
                <div className="relative pl-8">
                  {/* Vertical connecting branch to leaves */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-stone-300" />

                  <div className="absolute left-1.5 top-2.5 w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                    ✓
                  </div>

                  <div className="p-4 rounded-xl bg-white border-2 border-emerald-600/30 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                      <span>Terminal Destination Crown</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold">
                        Resolved Host: {result.domain}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-stone-900 break-all select-all">
                      {result.finalUrl}
                    </div>
                  </div>
                </div>
              )}

              {/* TREE LEAVES / PARAMETER BRANCHES */}
              <div className="relative pl-8 pt-2 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                  <span>Parameter &amp; Telemetry Branches</span>
                  <div className="h-px bg-stone-200 flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BRANCH LEAF 1: CLEAN SANITIZED URL */}
                  {(activeFilter === 'all' || activeFilter === 'clean') && (
                    <div className="p-4 rounded-xl bg-[#EBF1ED]/70 border border-[#607264]/30 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#2C3830]">
                          🌿 Clean Destination (No Trackers)
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Ready for Sharing
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-stone-200 font-mono text-xs text-stone-900 break-all select-all">
                        {result.cleanUrl}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(result.cleanUrl, 'Clean URL copied')}
                          className="flex-1 py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs text-center"
                        >
                          Copy Clean Link
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendToQR(result.cleanUrl)}
                          className="py-1.5 px-3 bg-white border border-stone-200 hover:border-stone-900 text-stone-900 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          title="Generate QR Code"
                        >
                          Make QR
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendToShorten(result.cleanUrl)}
                          className="py-1.5 px-3 bg-white border border-stone-200 hover:border-stone-900 text-stone-900 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          title="Create Shielded Short Link"
                        >
                          Shield Link
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BRANCH LEAF 2: UTM ATTRIBUTION PARAMETERS */}
                  {(activeFilter === 'all' || activeFilter === 'utm') && (
                    <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-800">
                          🏷 Marketing UTM Tags ({Object.keys(result.utmParams).length})
                        </span>
                        <span className="text-[11px] text-stone-400">
                          Attribution
                        </span>
                      </div>

                      {Object.keys(result.utmParams).length > 0 ? (
                        <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                          {Object.entries(result.utmParams).map(([k, v]) => (
                            <div
                              key={k}
                              className="p-2 bg-[#FAF8F5] rounded-lg border border-stone-200/80 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-stone-900 block truncate">{k}</span>
                                <span className="text-stone-600 block truncate text-[10px]">{v}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(v, `Copied ${k}`)}
                                className="text-[10px] text-stone-400 hover:text-stone-900 underline cursor-pointer shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-[#FAF8F5] border border-stone-200/80 rounded-lg text-xs text-stone-500">
                          No UTM campaign tags found on this destination.
                        </div>
                      )}
                    </div>
                  )}

                  {/* BRANCH LEAF 3: AD PLATFORM TOKENS */}
                  {(activeFilter === 'all' || activeFilter === 'trackers') && (
                    <div className="p-4 rounded-xl bg-[#FAF4F0]/70 border border-[#C88D77]/30 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#8C4E3A]">
                          🎯 Surveillance &amp; Ad Trackers ({Object.keys(result.trackingParams).length})
                        </span>
                        <span className="text-[11px] text-amber-800 font-medium">
                          Ad Click IDs
                        </span>
                      </div>

                      {Object.keys(result.trackingParams).length > 0 ? (
                        <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                          {Object.entries(result.trackingParams).map(([k, v]) => {
                            const info = getTrackerInfo(k);
                            return (
                              <div
                                key={k}
                                className="p-2 bg-white rounded-lg border border-[#C88D77]/30 space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-900">{k}</span>
                                  <span className="text-[10px] text-amber-800 font-sans font-medium">
                                    {info.network}
                                  </span>
                                </div>
                                <div className="text-stone-700 text-[10px] break-all select-all font-mono">
                                  {v}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-[#EBF1ED]/50 border border-[#607264]/20 rounded-lg text-xs text-[#2C3830]">
                          ✓ Zero ad network tokens (gclid, fbclid, ttclid) identified.
                        </div>
                      )}
                    </div>
                  )}

                  {/* BRANCH LEAF 4: Q2R PLATFORM METRICS */}
                  {result.internalStats && (activeFilter === 'all' || activeFilter === 'clean') && (
                    <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-900">
                          📊 Platform Traffic Telemetry
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          Live Record
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-stone-100">
                          <span className="text-stone-400 block text-[10px]">RECORDED CLICKS</span>
                          <span className="text-lg font-bold text-stone-900 tabular-nums">
                            {result.internalStats.clicks}
                          </span>
                        </div>
                        <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-stone-100">
                          <span className="text-stone-400 block text-[10px]">ROUTING MODE</span>
                          <span className="text-xs font-semibold text-stone-800">
                            {result.internalStats.isShielded ? 'Privacy Shield' : 'Direct 302'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-stone-100 col-span-2">
                          <span className="text-stone-400 block text-[10px]">CREATED DATE</span>
                          <span className="text-xs text-stone-700">
                            {new Date(result.internalStats.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECENT INSPECTIONS HISTORY */}
      {history.length > 0 && (
        <div className="bento-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Recent Inspected URLs
            </span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-stone-400 hover:text-stone-900 underline cursor-pointer"
            >
              Clear History
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <div
                key={item.url}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-stone-200 hover:border-stone-900 rounded-lg text-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput(item.url);
                    handleInspect(undefined, item.url);
                  }}
                  className="font-mono text-stone-800 hover:underline cursor-pointer truncate max-w-xs"
                >
                  {item.url}
                </button>
                {item.hasTracking && (
                  <span className="text-[10px] text-amber-700 font-semibold">Trackers</span>
                )}
                <button
                  type="button"
                  onClick={() => removeHistoryItem(item.url)}
                  className="text-stone-400 hover:text-rose-600 p-0.5 cursor-pointer ml-1"
                  title="Remove from history"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
