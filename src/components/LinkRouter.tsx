import React, { useState } from 'react';
import { LinkRecord } from '../types';
import { renderQRCodeSVG } from '../utils/qrRenderer';
import {
  createEdgeLink,
  deleteEdgeLink,
  updateEdgeLink,
} from '../services/cloudflare';

interface LinkRouterProps {
  links: LinkRecord[];
  onRefresh: () => void;
  onAddLink?: (newLink: LinkRecord) => void;
  onDeleteLink?: (id: string, slug: string) => void;
  onSendToQR: (url: string) => void;
  onInspectLink?: (url: string) => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const LinkRouter: React.FC<LinkRouterProps> = ({
  links,
  onRefresh,
  onAddLink,
  onDeleteLink,
  onSendToQR,
  onInspectLink,
  onToast,
}) => {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [isShielded, setIsShielded] = useState(false);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkToDelete, setLinkToDelete] = useState<{ id: string; slug: string; url: string; clicks: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkRecord | null>(null);

  // Creation Handler
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalUrl.trim()) {
      onToast('Please enter a destination URL.', 'error');
      return;
    }

    let normalized = originalUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    try {
      new URL(normalized);
    } catch {
      onToast('Invalid URL format.', 'error');
      return;
    }

    let slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!slug) {
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      for (let i = 0; i < 6; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } else {
      const alreadyTaken = links.some((l) => l.slug.toLowerCase() === slug);
      if (alreadyTaken) {
        onToast(`Custom slug "/r/${slug}" is already taken. Please choose another.`, 'error');
        return;
      }
    }

    try {
      setIsCreating(true);

      const createdRecord = await createEdgeLink({
        originalUrl: normalized,
        customSlug: slug,
        isShielded,
        title: title.trim() || undefined,
      });

      if (createdRecord && onAddLink) {
        onAddLink(createdRecord);
      }

      onToast(`Short link /r/${slug} is now live!`, 'success');
      setOriginalUrl('');
      setCustomSlug('');
      setTitle('');
      setIsShielded(false);
      onRefresh();
    } catch (err: any) {
      onToast(err.message || 'Error creating short link.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleShield = async (link: LinkRecord) => {
    const updatedState = !link.isShielded;
    try {
      await updateEdgeLink(link.id, { isShielded: updatedState });

      if (selectedLink && selectedLink.id === link.id) {
        setSelectedLink({ ...selectedLink, isShielded: updatedState });
      }

      onToast(
        `Privacy Shield ${updatedState ? 'enabled' : 'disabled'} for /r/${link.slug}`,
        'info'
      );
      onRefresh();
    } catch {
      onToast('Could not update shield setting.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!linkToDelete) return;
    const { id, slug } = linkToDelete;

    try {
      setIsDeleting(true);
      if (onDeleteLink) {
        onDeleteLink(id, slug);
      }

      await deleteEdgeLink(id);

      onToast(`Link /r/${slug} deleted permanently.`, 'info');
      setLinkToDelete(null);
      if (selectedLink && selectedLink.id === id) {
        setSelectedLink(null);
      }
      onRefresh();
    } catch {
      onToast('Failed to delete link.', 'error');
      setLinkToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getFullShortUrl = (slug: string) => {
    return `${window.location.origin}/r/${slug}`;
  };

  const handleCopyLink = async (slug: string) => {
    const full = getFullShortUrl(slug);
    try {
      await navigator.clipboard.writeText(full);
      onToast(`Copied ${full} to clipboard`, 'success');
    } catch {
      onToast('Failed to copy to clipboard', 'error');
    }
  };

  const filteredLinks = links.filter((l) => {
    const q = searchTerm.toLowerCase();
    return (
      l.slug.toLowerCase().includes(q) ||
      l.originalUrl.toLowerCase().includes(q) ||
      (l.title && l.title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-stone-200/70 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-1.5">
            <span>Sovereign Link Router</span>
            <span aria-hidden="true">·</span>
            <span>Zero Sign-Up Required</span>
            <span aria-hidden="true">·</span>
            <span>Permanent Cloud Storage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Short Links &amp; Relay Routing
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Create branded short URLs with instant redirects, privacy shield protection, and click tracking. Inspect tracking metrics anytime.
          </p>
        </div>

        {/* Stats badge */}
        <div className="flex items-center gap-4 text-xs text-stone-600 bg-white px-3.5 py-2 rounded-xl border border-stone-200/80 shadow-2xs shrink-0">
          <div>
            <span className="text-stone-400">Active Links:</span>{' '}
            <span className="font-semibold text-stone-900 tabular-nums">
              {links.length}
            </span>
          </div>
          <span className="text-stone-300">·</span>
          <div>
            <span className="text-stone-400">Total Clicks:</span>{' '}
            <span className="font-semibold text-stone-900 tabular-nums">
              {links.reduce((acc, l) => acc + l.clicks, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Creation Card */}
      <div className="bento-card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-stone-900">
            Create a New Short Link
          </h2>
          <p className="text-xs text-stone-500">
            Enter a destination URL to generate a short, easy-to-share link. No account or password needed.
          </p>
        </div>

        <form onSubmit={handleCreateLink} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Destination URL *
              </label>
              <input
                type="url"
                required
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="https://company.com/portal/q4-briefing"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 min-w-0"
              />
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Custom Link Path (Optional)
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 text-xs font-mono bg-[#F5F3EF] border border-r-0 border-stone-200 rounded-l-xl text-stone-500 shrink-0">
                  /r/
                </span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="custom-name"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-r-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 min-w-0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Note or Campaign Label (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer Promo, Newsletter Link"
                className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 min-w-0"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isShielded}
                  onChange={(e) => setIsShielded(e.target.checked)}
                  className="rounded text-stone-900"
                />
                <span className="text-xs text-stone-700 font-medium">
                  Enable Privacy Shield (Preview before redirect)
                </span>
              </label>

              <button
                type="submit"
                disabled={isCreating}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors rounded-xl cursor-pointer shrink-0 disabled:opacity-50 shadow-xs whitespace-nowrap"
              >
                {isCreating ? 'Creating...' : 'Create Short Link'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Directory Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              Active Short Links ({filteredLinks.length})
            </h2>
            <p className="text-xs text-stone-500">
              Manage short links, view tracking telemetry, or generate matching QR codes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search links..."
              className="px-3.5 py-1.5 text-xs bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 w-full sm:w-64"
            />
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-1.5 text-xs font-medium border border-stone-200 hover:border-stone-900 text-stone-700 rounded-xl cursor-pointer transition-colors shrink-0"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bento-card overflow-x-auto min-w-0">
          {filteredLinks.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <p>{searchTerm ? 'No links found matching your search.' : 'You have not created any short links yet.'}</p>
              <p className="text-stone-500 font-sans">Create your first short link above with zero account requirements.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-stone-200/80 text-[11px] uppercase text-stone-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Short Link</th>
                  <th className="py-3 px-4 font-semibold">Destination</th>
                  <th className="py-3 px-4 font-semibold text-right">Clicks</th>
                  <th className="py-3 px-4 font-semibold">Security Mode</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLinks.map((link) => (
                  <tr
                    key={link.id}
                    className="hover:bg-[#FAF8F5]/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-stone-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLink(link)}
                          className="hover:underline flex items-center gap-1 text-left cursor-pointer font-bold"
                          title="Open Link Details & QR"
                        >
                          /r/{link.slug}
                          <span className="text-[10px] text-stone-400">ℹ</span>
                        </button>
                      </div>
                      {link.title && (
                        <span className="block text-[11px] font-sans font-normal text-stone-500 truncate max-w-xs">
                          {link.title}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-stone-600 max-w-xs truncate">
                      <span title={link.originalUrl}>{link.originalUrl}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-right tabular-nums font-semibold text-stone-900 whitespace-nowrap">
                      {link.clicks.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleShield(link)}
                        className={`text-[11px] font-medium cursor-pointer rounded-lg px-2.5 py-1 border transition-colors ${
                          link.isShielded
                            ? 'bg-[#EBF1ED] text-[#2C3830] border-[#607264]/30'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                        title="Click to toggle Privacy Shield"
                      >
                        {link.isShielded ? 'Shielded' : 'Direct 302'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap tabular-nums text-[11px]">
                      {new Date(link.createdAt).toISOString().split('T')[0]}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(link.slug)}
                        className="px-2.5 py-1 text-[11px] font-medium border border-stone-200 hover:border-stone-900 text-stone-800 rounded-lg transition-colors cursor-pointer"
                        title="Copy short link"
                      >
                        Copy
                      </button>

                      {onInspectLink && (
                        <button
                          type="button"
                          onClick={() => onInspectLink(getFullShortUrl(link.slug))}
                          className="px-2.5 py-1 text-[11px] font-medium bg-[#FAF4F0] text-[#8C4E3A] hover:bg-[#f3e7df] border border-[#C88D77]/20 rounded-lg transition-colors cursor-pointer"
                          title="Inspect tracking parameters & visual tree map"
                        >
                          Tree Map
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSendToQR(getFullShortUrl(link.slug))}
                        className="px-2.5 py-1 text-[11px] font-medium bg-[#EBF1ED] text-[#2C3830] hover:bg-[#dfe9e2] rounded-lg transition-colors cursor-pointer"
                        title="Generate vector QR code"
                      >
                        Make QR
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setLinkToDelete({
                            id: link.id,
                            slug: link.slug,
                            url: link.originalUrl,
                            clicks: link.clicks,
                          })
                        }
                        className="px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete link"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DYNAMIC LINK DETAILS & ACTION MODAL */}
      {selectedLink && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLink(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200/90 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Link Telemetry &amp; Controls
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  /r/{selectedLink.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLink(null)}
                className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Short URL & Copy */}
              <div className="p-3 bg-[#FAF8F5] border border-stone-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                  Public Routing URL
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-stone-900 truncate">
                    {getFullShortUrl(selectedLink.slug)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(selectedLink.slug)}
                    className="px-2.5 py-1 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded transition-colors cursor-pointer shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Target Destination */}
              <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                  Target Destination
                </span>
                <div className="font-mono text-xs text-stone-700 break-all select-all">
                  {selectedLink.originalUrl}
                </div>
              </div>

              {/* QR Preview & Clicks Strip */}
              <div className="flex items-center gap-4 p-4 bg-[#FAF8F5] border border-stone-200 rounded-xl">
                <div
                  className="w-24 h-24 bg-white p-1.5 rounded-lg border border-stone-200 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html: renderQRCodeSVG(getFullShortUrl(selectedLink.slug), {
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
                    }),
                  }}
                />

                <div className="space-y-2 text-xs flex-1">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Recorded Clicks</span>
                    <span className="text-xl font-bold text-stone-900 tabular-nums">
                      {selectedLink.clicks.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleShield(selectedLink)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors ${
                        selectedLink.isShielded
                          ? 'bg-[#EBF1ED] text-[#2C3830] border-[#607264]/30'
                          : 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      Shield: {selectedLink.isShielded ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                {onInspectLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLink(null);
                      onInspectLink(getFullShortUrl(selectedLink.slug));
                    }}
                    className="py-2.5 px-3 font-semibold text-center bg-[#FAF4F0] text-[#8C4E3A] hover:bg-[#f3e7df] border border-[#C88D77]/30 rounded-xl transition-colors cursor-pointer"
                  >
                    Open in Tree Map
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedLink(null);
                    onSendToQR(getFullShortUrl(selectedLink.slug));
                  }}
                  className="py-2.5 px-3 font-semibold text-center bg-[#EBF1ED] text-[#2C3830] hover:bg-[#dfe9e2] rounded-xl transition-colors cursor-pointer"
                >
                  Edit in QR Studio
                </button>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-stone-100 text-xs">
                <a
                  href={`/r/${selectedLink.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-stone-700 hover:text-stone-900 underline"
                >
                  Launch Destination Live ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC IN-APP DELETION MODAL */}
      {linkToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setLinkToDelete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200/90 shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Delete Short Link Permanently?
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                You are about to permanently remove <strong className="font-mono text-stone-800">/r/{linkToDelete.slug}</strong>.
              </p>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs font-mono">
              <div className="text-stone-400 text-[10px]">TARGET DESTINATION</div>
              <div className="text-stone-700 truncate">{linkToDelete.url}</div>
              <div className="text-stone-400 text-[10px] pt-1">RECORDED CLICKS: {linkToDelete.clicks}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setLinkToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
