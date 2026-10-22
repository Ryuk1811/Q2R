import React, { useEffect, useState } from 'react';
import { ActiveTab, LinkRecord } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { QRStudio } from './components/QRStudio';
import { LinkRouter } from './components/LinkRouter';
import { UrlInspector } from './components/UrlInspector';
import { StaticPages } from './components/StaticPages';
import { PrivacyShieldModal } from './components/PrivacyShieldModal';
import { Toast, ToastMessage } from './components/Toast';
import { CloudflareConsoleModal } from './components/CloudflareConsoleModal';
import { BrandLogo } from './components/BrandLogo';
import { renderQRCodeSVG } from './utils/qrRenderer';
import {
  createEdgeLink,
  fetchLinkRegistry,
} from './services/cloudflare';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [studioInitialUrl, setStudioInitialUrl] = useState<string>('');
  const [shieldSlug, setShieldSlug] = useState<string | null>(null);
  const [isQuickShortenOpen, setIsQuickShortenOpen] = useState(false);
  const [isCloudflareModalOpen, setIsCloudflareModalOpen] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [quickSlug, setQuickSlug] = useState('');
  const [quickShield, setQuickShield] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<LinkRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inspectorInitialUrl, setInspectorInitialUrl] = useState('');

  // Enforce Light Mode Only
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Keyboard shortcut (Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQuickShortenOpen) {
          setIsQuickShortenOpen(false);
          setCreatedLink(null);
        }
        if (shieldSlug) setShieldSlug(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickShortenOpen, shieldSlug]);

  // Check URL query parameters for ?shield=slug or ?error=link_not_found
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shield = params.get('shield');
    const err = params.get('error');

    if (shield) {
      setShieldSlug(shield);
    }
    if (err === 'link_not_found') {
      const slug = params.get('slug') || '';
      addToast(`The link /r/${slug} does not exist.`, 'error');
    }
  }, []);

  const addToast = (
    text: string,
    type: ToastMessage['type'] = 'info',
    action?: { label: string; onClick: () => void }
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type, action }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchLinks = async () => {
    try {
      const data = await fetchLinkRegistry();
      setLinks(data);
    } catch (err) {
      console.warn('Could not load links registry', err);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const createShortLinkFromUrl = async (url: string): Promise<string | null> => {
    let slug = '';
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    for (let i = 0; i < 6; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const record = await createEdgeLink({
        originalUrl: url,
        customSlug: slug,
        isShielded: false,
      });

      setLinks((prev) => [record, ...prev.filter((l) => l.slug !== record.slug)]);
      return `${window.location.origin}/r/${record.slug}`;
    } catch {
      return null;
    }
  };

  const handleSendToQR = (url: string) => {
    setStudioInitialUrl(url);
    setActiveTab('studio');
    addToast('Link loaded into QR Studio.', 'success');
  };

  const handleSendToShorten = (url: string) => {
    setQuickUrl(url);
    setCreatedLink(null);
    setIsQuickShortenOpen(true);
    addToast('URL loaded into short link creator.', 'info');
  };

  const handleInspectLink = (url: string) => {
    setInspectorInitialUrl(url);
    setActiveTab('inspector');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddLink = (newLink: LinkRecord) => {
    setLinks((prev) => [newLink, ...prev.filter((l) => l.slug !== newLink.slug)]);
  };

  const handleDeleteLink = (id: string, slug: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id && l.slug !== slug));
  };

  const handleQuickShortenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) {
      addToast('Please enter a destination URL.', 'error');
      return;
    }

    let normalized = quickUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    try {
      new URL(normalized);
    } catch {
      addToast('Invalid URL format. Please enter a valid website address.', 'error');
      return;
    }

    let targetSlug = quickSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!targetSlug) {
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      for (let i = 0; i < 6; i++) {
        targetSlug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } else {
      const alreadyTaken = links.some((l) => l.slug.toLowerCase() === targetSlug);
      if (alreadyTaken) {
        addToast(`Custom slug "/r/${targetSlug}" is already in use. Please choose another.`, 'error');
        return;
      }
    }

    try {
      setIsQuickCreating(true);

      const finalRecord = await createEdgeLink({
        originalUrl: normalized,
        customSlug: targetSlug,
        isShielded: quickShield,
        title: quickTitle.trim() || undefined,
      });

      handleAddLink(finalRecord);
      setCreatedLink(finalRecord);
      addToast(`Short link /r/${targetSlug} is now live!`, 'success', {
        label: 'Inspect Route',
        onClick: () => handleInspectLink(`${window.location.origin}/r/${targetSlug}`),
      });

      // Clear input fields
      setQuickUrl('');
      setQuickSlug('');
      setQuickTitle('');
      setQuickShield(false);
    } catch (err: any) {
      addToast(err.message || 'Error creating short link.', 'error');
    } finally {
      setIsQuickCreating(false);
    }
  };

  const handleCopyCreatedLink = async (slug: string) => {
    const full = `${window.location.origin}/r/${slug}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      addToast(`Copied ${full} to clipboard`, 'success');
    } catch {
      addToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 transition-colors w-full max-w-full overflow-x-hidden">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenQuickShorten={() => {
          setCreatedLink(null);
          setIsQuickShortenOpen(true);
        }}
        onOpenCloudflareModal={() => setIsCloudflareModalOpen(true)}
      />

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {activeTab === 'home' && (
          <LandingPage
            onNavigate={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onQuickShorten={() => {
              setCreatedLink(null);
              setIsQuickShortenOpen(true);
            }}
            onInspectLink={handleInspectLink}
            onOpenCloudflareModal={() => setIsCloudflareModalOpen(true)}
            linksCount={links.length}
            totalClicks={links.reduce((acc, l) => acc + l.clicks, 0)}
          />
        )}

        {activeTab === 'studio' && (
          <QRStudio
            initialUrl={studioInitialUrl}
            onToast={addToast}
            onCreateShortLinkFromUrl={createShortLinkFromUrl}
          />
        )}

        {activeTab === 'router' && (
          <LinkRouter
            links={links}
            onRefresh={fetchLinks}
            onAddLink={handleAddLink}
            onDeleteLink={handleDeleteLink}
            onSendToQR={handleSendToQR}
            onInspectLink={handleInspectLink}
            onToast={addToast}
          />
        )}

        {activeTab === 'inspector' && (
          <UrlInspector
            initialUrl={inspectorInitialUrl}
            onSendToQR={handleSendToQR}
            onSendToShorten={handleSendToShorten}
            onToast={addToast}
          />
        )}

        {(activeTab === 'about' || activeTab === 'privacy' || activeTab === 'contact') && (
          <StaticPages
            section={activeTab}
            onNavigate={(sec) => setActiveTab(sec)}
            onToast={addToast}
          />
        )}
      </main>

      {/* Dynamic Quick Shorten Multi-State Modal */}
      {isQuickShortenOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsQuickShortenOpen(false);
              setCreatedLink(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200/90 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {createdLink ? 'Short Link Created' : 'Create a Short Link'}
                </h3>
                <p className="text-xs text-stone-500">
                  {createdLink
                    ? 'Permanent route active with zero sign-up'
                    : 'Instant routing with zero sign-up required'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsQuickShortenOpen(false);
                  setCreatedLink(null);
                }}
                className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer text-xs"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* DYNAMIC SUCCESS CONFIRMATION STATE */}
            {createdLink ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 bg-[#EBF1ED]/70 border border-[#607264]/30 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C3830] block">
                    ✓ Active Routing Address
                  </span>
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white border border-stone-200 rounded-lg">
                    <span className="font-mono text-xs font-bold text-stone-900 truncate">
                      {window.location.origin}/r/{createdLink.slug}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCreatedLink(createdLink.slug)}
                      className="px-2.5 py-1 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded transition-colors cursor-pointer shrink-0"
                    >
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    Destination: {createdLink.originalUrl}
                  </div>
                </div>

                {/* Live Vector QR Preview for Created Link */}
                <div className="flex items-center gap-4 p-3 bg-[#FAF8F5] border border-stone-200 rounded-xl">
                  <div
                    className="w-20 h-20 bg-white p-1.5 rounded-lg border border-stone-200 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden"
                    dangerouslySetInnerHTML={{
                      __html: renderQRCodeSVG(
                        `${window.location.origin}/r/${createdLink.slug}`,
                        {
                          errorCorrection: 'M',
                          fgColor: '#1A1C1A',
                          bgColor: '#FFFFFF',
                          dotStyle: 'rounded',
                          eyeFrameStyle: 'rounded',
                          eyeInnerStyle: 'rounded',
                          logoPreset: 'none',
                          logoSize: 0.22,
                          frameStyle: 'none',
                          frameText: '',
                          margin: 1,
                        }
                      ),
                    }}
                  />
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-stone-900 block">Instant Vector QR</span>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Matches your short link. You can customize colors and icons in the QR Studio anytime.
                    </p>
                  </div>
                </div>

                {/* Quick Action Navigation Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickShortenOpen(false);
                      setCreatedLink(null);
                      handleInspectLink(`${window.location.origin}/r/${createdLink.slug}`);
                    }}
                    className="py-2 px-3 text-center font-medium bg-[#FAF4F0] hover:bg-[#f3e7df] text-[#8C4E3A] border border-[#C88D77]/30 rounded-xl transition-colors cursor-pointer"
                  >
                    View in Tree Map
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickShortenOpen(false);
                      setCreatedLink(null);
                      handleSendToQR(`${window.location.origin}/r/${createdLink.slug}`);
                    }}
                    className="py-2 px-3 text-center font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Customize in Studio
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setCreatedLink(null)}
                    className="text-stone-500 hover:text-stone-900 underline cursor-pointer"
                  >
                    + Create another link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickShortenOpen(false);
                      setCreatedLink(null);
                    }}
                    className="px-4 py-2 font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* DYNAMIC CREATION FORM STATE */
              <form onSubmit={handleQuickShortenSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Destination URL *
                  </label>
                  <input
                    type="url"
                    required
                    autoFocus
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    placeholder="https://company.com/portal/q4-briefing"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Custom Path / Slug (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
                        let s = '';
                        for (let i = 0; i < 6; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
                        setQuickSlug(s);
                      }}
                      className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
                    >
                      🎲 Randomize
                    </button>
                  </div>
                  <div className="flex items-center">
                    <span className="px-3 py-2 text-xs font-mono bg-[#F5F3EF] border border-r-0 border-stone-200 rounded-l-xl text-stone-500">
                      /r/
                    </span>
                    <input
                      type="text"
                      value={quickSlug}
                      onChange={(e) => setQuickSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="custom-path"
                      className="w-full px-3 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-r-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Campaign Label or Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="e.g. Summer Promo, Bio Link"
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={quickShield}
                      onChange={(e) => setQuickShield(e.target.checked)}
                      className="rounded text-stone-900"
                    />
                    <span className="text-xs text-stone-700 font-medium">
                      Enable Privacy Shield (Preview interstitial before redirect)
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsQuickShortenOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isQuickCreating}
                    className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isQuickCreating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Short Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Privacy Shield Interstitial */}
      {shieldSlug && (
        <PrivacyShieldModal
          slug={shieldSlug}
          onClose={() => {
            setShieldSlug(null);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
          onInspect={handleInspectLink}
        />
      )}

      {/* Cloudflare Edge Console Monitor Modal */}
      <CloudflareConsoleModal
        isOpen={isCloudflareModalOpen}
        onClose={() => setIsCloudflareModalOpen(false)}
        onToast={addToast}
      />

      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Footer */}
      <footer className="border-t border-stone-200/70 py-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-stone-500 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo
              size="sm"
              showSubtitle={true}
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <span aria-hidden="true" className="text-stone-300">·</span>
            <button
              onClick={() => setIsCloudflareModalOpen(true)}
              className="hover:text-stone-900 transition-colors cursor-pointer flex items-center gap-1.5 text-stone-600 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Platform Status (99.99%)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              onClick={() => {
                setActiveTab('about');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => {
                setActiveTab('privacy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                setActiveTab('contact');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Contact Support
            </button>
            <a
              href="mailto:duplexinterface@outlook.com"
              className="font-mono text-stone-800 hover:text-stone-900 font-semibold underline transition-colors"
            >
              duplexinterface@outlook.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
