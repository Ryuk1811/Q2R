import React, { useId, useMemo, useState } from 'react';
import {
  CryptoData,
  EmailData,
  EventData,
  GeoData,
  QRConfig,
  QRContentType,
  SMSData,
  VCardData,
  WifiData,
} from '../types';
import { buildQRPayload } from '../utils/payloadBuilder';
import {
  copyToClipboard,
  exportAsRaster,
  exportAsSVG,
  printQRCode,
  renderQRCodeSVG,
} from '../utils/qrRenderer';
import { saveQRToCloudflareR2 } from '../services/cloudflare';

interface QRStudioProps {
  initialUrl?: string;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onCreateShortLinkFromUrl: (url: string) => Promise<string | null>;
}

export const QRStudio: React.FC<QRStudioProps> = ({
  initialUrl = '',
  onToast,
  onCreateShortLinkFromUrl,
}) => {
  const [contentType, setContentType] = useState<QRContentType>('url');

  // Input states
  const [urlText, setUrlText] = useState(initialUrl || 'https://');
  const [plainText, setPlainText] = useState('Welcome to Q2R (Quick 2 Redirect)');
  const [wifi, setWifi] = useState<WifiData>({
    ssid: 'Guest_WiFi',
    password: '',
    encryption: 'WPA',
    hidden: false,
  });
  const [vcard, setVcard] = useState<VCardData>({
    firstName: 'Q2R',
    lastName: 'Support',
    organization: 'Q2R · Quick 2 Redirect',
    title: 'Customer Relations',
    phone: '+1 (555) 234-5678',
    email: 'duplexinterface@outlook.com',
    url: 'https://quickrelease.io',
    street: '100 Market Street',
    city: 'San Francisco',
    country: 'United States',
    note: 'Official Support: duplexinterface@outlook.com',
  });
  const [email, setEmail] = useState<EmailData>({
    email: 'duplexinterface@outlook.com',
    subject: 'Project Inquiry',
    body: 'Hello Q2R team, I am contacting you regarding your services.',
  });
  const [phone, setPhone] = useState('+15552345678');
  const [sms, setSms] = useState<SMSData>({
    phone: '+15552345678',
    message: 'Hello! Sent via Q2R.',
  });
  const [event, setEvent] = useState<EventData>({
    title: 'Annual Executive Summit & Gala',
    location: 'Metropolitan Center, Grand Hall',
    startDate: '2026-11-20T18:00',
    endDate: '2026-11-20T21:00',
    description: 'Executive leadership keynote presentations, technical briefings, and reception.',
  });
  const [geo, setGeo] = useState<GeoData>({
    latitude: '37.7749',
    longitude: '-122.4194',
    query: '',
  });
  const [crypto, setCrypto] = useState<CryptoData>({
    network: 'bitcoin',
    address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    amount: '0.05',
    label: 'Corporate Settlement',
  });

  // QR Design Configuration
  const [config, setConfig] = useState<QRConfig>({
    errorCorrection: 'Q',
    fgColor: '#1A1C1A',
    bgColor: '#FFFFFF',
    dotStyle: 'rounded',
    eyeFrameStyle: 'rounded',
    eyeInnerStyle: 'rounded',
    eyeColor: '#1A1C1A',
    eyeInnerColor: '#1A1C1A',
    logoPreset: 'none',
    customLogoUrl: '',
    logoSize: 0.22,
    frameStyle: 'none',
    frameText: 'SCAN ME',
    margin: 2,
  });

  const [activeConfigTab, setActiveConfigTab] = useState<'style' | 'eyes' | 'color' | 'logo' | 'frame'>('style');
  const [isTransparentBg, setIsTransparentBg] = useState(false);
  const [isCreatingShortLink, setIsCreatingShortLink] = useState(false);
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [exporting, setExporting] = useState(false);
  const [savedQRs, setSavedQRs] = useState<Array<{
    id: string;
    name: string;
    contentType: QRContentType;
    payload: string;
    createdAt: number;
    config: QRConfig;
  }>>(() => {
    try {
      const raw = localStorage.getItem('quickrelease_saved_qrs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const qrPayload = useMemo(() => {
    return buildQRPayload(contentType, {
      urlText,
      plainText,
      wifi,
      vcard,
      email,
      phone,
      sms,
      event,
      geo,
      crypto,
    });
  }, [contentType, urlText, plainText, wifi, vcard, email, phone, sms, event, geo, crypto]);

  const svgOutput = useMemo(() => {
    return renderQRCodeSVG(qrPayload, {
      ...config,
      bgColor: isTransparentBg ? 'transparent' : config.bgColor,
    });
  }, [qrPayload, config, isTransparentBg]);

  const fileInputId = useId();

  const handleShortenUrl = async () => {
    if (!urlText.trim() || urlText === 'https://') {
      onToast('Please enter a website URL to shorten.', 'error');
      return;
    }
    setIsCreatingShortLink(true);
    try {
      const shortUrl = await onCreateShortLinkFromUrl(urlText);
      if (shortUrl) {
        setUrlText(shortUrl);
        onToast(`Short link created! QR code updated: ${shortUrl}`, 'success');
      }
    } catch {
      onToast('Could not create short link.', 'error');
    } finally {
      setIsCreatingShortLink(false);
    }
  };

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onToast('Logo file size must be under 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setConfig((prev) => ({
        ...prev,
        customLogoUrl: result,
        logoPreset: 'custom',
        errorCorrection: 'H',
      }));
      onToast('Custom logo applied. Adjusted error correction for optimal scanning.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleExport = async (format: 'svg' | 'png' | 'jpeg') => {
    try {
      setExporting(true);
      if (format === 'svg') {
        exportAsSVG(svgOutput, `quick-release-${contentType}.svg`);
        onToast('Vector SVG downloaded successfully.', 'success');
      } else {
        await exportAsRaster(svgOutput, format, exportScale, `quick-release-${contentType}`);
        onToast(`High-resolution ${format.toUpperCase()} (${exportScale * 512}px) downloaded.`, 'success');
      }
    } catch {
      onToast('Export failed. Please check browser permissions.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyClipboard = async (mode: 'png' | 'svg') => {
    try {
      const res = await copyToClipboard(svgOutput, mode);
      if (res === 'png') {
        onToast('Image copied to clipboard.', 'success');
      } else {
        onToast('SVG code copied to clipboard.', 'success');
      }
    } catch {
      onToast('Unable to copy to clipboard.', 'error');
    }
  };

  const handlePrint = () => {
    printQRCode(svgOutput, `Q2R QR Code - ${contentType}`);
  };

  const [isSavingVault, setIsSavingVault] = useState(false);

  const handleSaveToCloudflareR2 = async () => {
    setIsSavingVault(true);
    try {
      const title = contentType === 'url' ? urlText : `qr-${contentType}`;
      const res = await saveQRToCloudflareR2(title, svgOutput, contentType, config);
      if (res.success && res.publicUrl) {
        await navigator.clipboard.writeText(res.publicUrl).catch(() => {});
        onToast(`Archived to Cloud Vault. Public link copied.`, 'success');
      } else {
        onToast('Uploaded to Cloud Vault successfully.', 'success');
      }
    } catch {
      onToast('Failed to archive QR asset.', 'error');
    } finally {
      setIsSavingVault(false);
    }
  };

  const applyPalette = (fg: string, bg: string, transparent = false) => {
    setIsTransparentBg(transparent);
    setConfig((prev) => ({
      ...prev,
      fgColor: fg,
      bgColor: bg,
      eyeColor: fg,
      eyeInnerColor: fg,
    }));
  };

  const handleSaveCurrentQR = () => {
    const title = contentType === 'url' ? urlText : `${contentType.toUpperCase()} QR Code`;
    const newItem = {
      id: `qr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: title.length > 40 ? title.substring(0, 37) + '...' : title || 'Custom QR Code',
      contentType,
      payload: qrPayload,
      createdAt: Date.now(),
      config: { ...config },
    };

    const updated = [newItem, ...savedQRs].slice(0, 20);
    setSavedQRs(updated);
    try {
      localStorage.setItem('quickrelease_saved_qrs', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    onToast('QR Code saved to your personal library.', 'success');
  };

  const handleDeleteSavedQR = (id: string) => {
    const updated = savedQRs.filter((item) => item.id !== id);
    setSavedQRs(updated);
    try {
      localStorage.setItem('quickrelease_saved_qrs', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    onToast('QR Code removed from library.', 'info');
  };

  const handleRestoreSavedQR = (item: typeof savedQRs[0]) => {
    setContentType(item.contentType);
    setConfig(item.config);
    if (item.contentType === 'url') setUrlText(item.payload);
    else if (item.contentType === 'text') setPlainText(item.payload);
    onToast(`Restored "${item.name}" into Studio.`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Page Header */}
      <div className="border-b border-stone-200/70 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            QR Code Generator
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Create beautiful, custom QR codes for websites, contacts, Wi-Fi networks, and digital marketing.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500 bg-white px-3 py-1.5 rounded-lg border border-stone-200/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Real-time vector rendering</span>
        </div>
      </div>

      {/* Asymmetric Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Inputs & Customization) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Content Type Picker */}
          <div className="bento-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
              Select Content Type
            </h2>

            <div className="flex flex-wrap gap-1.5 p-1 bg-[#F5F3EF] rounded-xl border border-stone-200/60">
              {(
                [
                  { id: 'url', label: 'Website URL' },
                  { id: 'wifi', label: 'Wi-Fi Network' },
                  { id: 'vcard', label: 'Contact Card' },
                  { id: 'text', label: 'Plain Text' },
                  { id: 'email', label: 'Email' },
                  { id: 'phone', label: 'Phone' },
                  { id: 'sms', label: 'SMS' },
                  { id: 'event', label: 'Calendar Event' },
                  { id: 'geo', label: 'Map Location' },
                  { id: 'crypto', label: 'Cryptocurrency' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setContentType(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    contentType === tab.id
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Details */}
          <div className="bento-card p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              Content Details
            </h2>

            {contentType === 'url' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Target Website URL
                  </label>
                  <input
                    type="url"
                    value={urlText}
                    onChange={(e) => setUrlText(e.target.value)}
                    placeholder="https://company.com/brand-hub"
                    className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 transition-all font-mono"
                  />
                </div>

                {/* Shorten Link Quick Integration */}
                <div className="p-4 bg-[#EBF1ED] border border-[#607264]/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">
                      Need a Trackable Short Link?
                    </span>
                    <span className="text-xs text-stone-600 block mt-0.5">
                      Shorten this address into a trackable redirect link and link it directly to this QR code.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleShortenUrl}
                    disabled={isCreatingShortLink}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#607264] hover:bg-[#526255] transition-colors rounded-lg cursor-pointer shrink-0 disabled:opacity-50 shadow-xs"
                  >
                    {isCreatingShortLink ? 'Creating...' : 'Shorten & Link'}
                  </button>
                </div>
              </div>
            )}

            {contentType === 'wifi' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Network Name (SSID) *
                    </label>
                    <input
                      type="text"
                      value={wifi.ssid}
                      onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                      placeholder="e.g. Office_WiFi"
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Security Type
                    </label>
                    <select
                      value={wifi.encryption}
                      onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as WifiData['encryption'] })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3 (Recommended)</option>
                      <option value="WEP">WEP (Legacy)</option>
                      <option value="nopass">None (Open Network)</option>
                    </select>
                  </div>
                </div>

                {wifi.encryption !== 'nopass' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Password
                    </label>
                    <input
                      type="text"
                      value={wifi.password}
                      onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                      placeholder="Wi-Fi password"
                      className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={wifi.hidden}
                    onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })}
                    className="rounded text-stone-900"
                  />
                  <span>This is a hidden network (SSID is not broadcasted)</span>
                </label>
              </div>
            )}

            {contentType === 'vcard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={vcard.firstName}
                      onChange={(e) => setVcard({ ...vcard, firstName: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={vcard.lastName}
                      onChange={(e) => setVcard({ ...vcard, lastName: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={vcard.organization}
                      onChange={(e) => setVcard({ ...vcard, organization: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={vcard.title}
                      onChange={(e) => setVcard({ ...vcard, title: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={vcard.phone}
                      onChange={(e) => setVcard({ ...vcard, phone: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={vcard.email}
                      onChange={(e) => setVcard({ ...vcard, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={vcard.url}
                      onChange={(e) => setVcard({ ...vcard, url: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">City</label>
                    <input
                      type="text"
                      value={vcard.city}
                      onChange={(e) => setVcard({ ...vcard, city: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={vcard.country}
                      onChange={(e) => setVcard({ ...vcard, country: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {contentType === 'text' && (
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Text or Message
                </label>
                <textarea
                  rows={4}
                  value={plainText}
                  onChange={(e) => setPlainText(e.target.value)}
                  placeholder="Type any message, serial number, or note..."
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
                />
              </div>
            )}

            {contentType === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={email.email}
                    onChange={(e) => setEmail({ ...email, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={email.subject}
                    onChange={(e) => setEmail({ ...email, subject: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Message Body</label>
                  <textarea
                    rows={3}
                    value={email.body}
                    onChange={(e) => setEmail({ ...email, body: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
            )}

            {contentType === 'phone' && (
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
            )}

            {contentType === 'sms' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={sms.phone}
                    onChange={(e) => setSms({ ...sms, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Pre-filled SMS</label>
                  <textarea
                    rows={2}
                    value={sms.message}
                    onChange={(e) => setSms({ ...sms, message: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
            )}

            {contentType === 'event' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={event.title}
                    onChange={(e) => setEvent({ ...event, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={event.startDate}
                      onChange={(e) => setEvent({ ...event, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={event.endDate}
                      onChange={(e) => setEvent({ ...event, endDate: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={event.location}
                    onChange={(e) => setEvent({ ...event, location: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
            )}

            {contentType === 'geo' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={geo.latitude}
                      onChange={(e) => setGeo({ ...geo, latitude: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={geo.longitude}
                      onChange={(e) => setGeo({ ...geo, longitude: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Or Address / Place</label>
                  <input
                    type="text"
                    value={geo.query}
                    onChange={(e) => setGeo({ ...geo, query: e.target.value })}
                    placeholder="e.g. Empire State Building, New York"
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
            )}

            {contentType === 'crypto' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Network</label>
                    <select
                      value={crypto.network}
                      onChange={(e) => setCrypto({ ...crypto, network: e.target.value as CryptoData['network'] })}
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
                    >
                      <option value="bitcoin">Bitcoin (BTC)</option>
                      <option value="ethereum">Ethereum (ETH)</option>
                      <option value="solana">Solana (SOL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Requested Amount</label>
                    <input
                      type="text"
                      value={crypto.amount}
                      onChange={(e) => setCrypto({ ...crypto, amount: e.target.value })}
                      placeholder="0.05"
                      className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Public Address</label>
                  <input
                    type="text"
                    value={crypto.address}
                    onChange={(e) => setCrypto({ ...crypto, address: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Design & Customization */}
          <div className="bento-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200/60 mb-5 gap-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Design &amp; Appearance
                </h2>
                <p className="text-xs text-stone-500">
                  Customize pattern geometries, colors, center logo, and borders.
                </p>
              </div>

              {/* Pro Sub-tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#F5F3EF] rounded-xl border border-stone-200/60 text-xs">
                {(
                  [
                    { id: 'style', label: 'Pattern' },
                    { id: 'eyes', label: 'Corner Eyes' },
                    { id: 'color', label: 'Palette' },
                    { id: 'logo', label: 'Logo' },
                    { id: 'frame', label: 'Frame' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveConfigTab(tab.id)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      activeConfigTab === tab.id
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern Tab */}
            {activeConfigTab === 'style' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-2">
                    Pattern Module Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        { id: 'rounded', label: 'Rounded' },
                        { id: 'dots', label: 'Circles' },
                        { id: 'squircle', label: 'Squircle' },
                        { id: 'diamond', label: 'Diamond' },
                        { id: 'square', label: 'Square' },
                      ] as const
                    ).map((dot) => (
                      <button
                        key={dot.id}
                        type="button"
                        onClick={() => setConfig({ ...config, dotStyle: dot.id })}
                        className={`p-2.5 text-xs text-center border rounded-xl transition-all cursor-pointer ${
                          config.dotStyle === dot.id
                            ? 'border-stone-900 bg-stone-100 font-semibold text-stone-900'
                            : 'border-stone-200 text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        {dot.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Outer Margin ({config.margin}x)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={1}
                      value={config.margin}
                      onChange={(e) => setConfig({ ...config, margin: parseInt(e.target.value, 10) })}
                      className="w-full accent-stone-900 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Error Correction Level
                    </label>
                    <div className="grid grid-cols-4 gap-1 text-xs font-mono">
                      {(['L', 'M', 'Q', 'H'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setConfig({ ...config, errorCorrection: lvl })}
                          className={`py-1.5 border rounded-lg text-center transition-colors cursor-pointer ${
                            config.errorCorrection === lvl
                              ? 'border-stone-900 bg-stone-900 text-white font-bold'
                              : 'border-stone-200 text-stone-600 hover:border-stone-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Corner Eyes Tab */}
            {activeConfigTab === 'eyes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-2">
                      Outer Eye Shape
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['rounded', 'circle', 'square'] as const).map((shape) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => setConfig({ ...config, eyeFrameStyle: shape })}
                          className={`p-2 text-xs text-center border rounded-lg capitalize cursor-pointer ${
                            config.eyeFrameStyle === shape
                              ? 'border-stone-900 bg-stone-100 font-bold text-stone-900'
                              : 'border-stone-200 text-stone-600'
                          }`}
                        >
                          {shape}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-2">
                      Inner Center Point
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'rounded', label: 'Rounded' },
                          { id: 'dot', label: 'Circle' },
                          { id: 'square', label: 'Square' },
                        ] as const
                      ).map((ball) => (
                        <button
                          key={ball.id}
                          type="button"
                          onClick={() => setConfig({ ...config, eyeInnerStyle: ball.id })}
                          className={`p-2 text-xs text-center border rounded-lg cursor-pointer ${
                            config.eyeInnerStyle === ball.id
                              ? 'border-stone-900 bg-stone-100 font-bold text-stone-900'
                              : 'border-stone-200 text-stone-600'
                          }`}
                        >
                          {ball.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Palette Tab */}
            {activeConfigTab === 'color' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-2">
                    Curated Color Themes
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPalette('#1A1C1A', '#FAF8F5')}
                      className="p-2 border border-stone-200 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer bg-[#FAF8F5] text-stone-900"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1A1C1A]" />
                      <span>Porcelain</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPalette('#2C3830', '#EBF1ED')}
                      className="p-2 border border-stone-200 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer bg-[#EBF1ED] text-stone-900"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-[#607264]" />
                      <span>Soft Sage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPalette('#3D251E', '#FAF4F0')}
                      className="p-2 border border-stone-200 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer bg-[#FAF4F0] text-stone-900"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-[#C88D77]" />
                      <span>Terracotta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPalette('#0A0A0A', '#FFFFFF')}
                      className="p-2 border border-stone-200 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer bg-white text-stone-900"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-black" />
                      <span>Pure Classic</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      QR Code Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.fgColor}
                        onChange={(e) => setConfig({ ...config, fgColor: e.target.value })}
                        className="w-8 h-8 p-0 border border-stone-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.fgColor}
                        onChange={(e) => setConfig({ ...config, fgColor: e.target.value })}
                        className="w-24 px-2 py-1 text-xs font-mono uppercase bg-[#FAF8F5] border border-stone-200 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Background
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          disabled={isTransparentBg}
                          value={config.bgColor}
                          onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                          className="w-8 h-8 p-0 border border-stone-300 rounded cursor-pointer disabled:opacity-30"
                        />
                        <input
                          type="text"
                          disabled={isTransparentBg}
                          value={config.bgColor}
                          onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                          className="w-24 px-2 py-1 text-xs font-mono uppercase bg-[#FAF8F5] border border-stone-200 rounded disabled:opacity-30"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isTransparentBg}
                          onChange={(e) => setIsTransparentBg(e.target.checked)}
                          className="rounded text-stone-900"
                        />
                        <span>Transparent</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logo Tab */}
            {activeConfigTab === 'logo' && (
              <div className="space-y-4">
                <label className="block text-xs font-medium text-stone-700">
                  Center Icon Preset
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'none', label: 'None' },
                      { id: 'link', label: 'Link' },
                      { id: 'wifi', label: 'Wi-Fi' },
                      { id: 'card', label: 'Contact' },
                      { id: 'shield', label: 'Shield' },
                      { id: 'globe', label: 'Website' },
                      { id: 'github', label: 'GitHub' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          logoPreset: item.id,
                          customLogoUrl: '',
                          errorCorrection: item.id === 'none' ? prev.errorCorrection : 'H',
                        }))
                      }
                      className={`p-2 text-xs text-center border rounded-lg cursor-pointer ${
                        config.logoPreset === item.id && !config.customLogoUrl
                          ? 'border-stone-900 bg-stone-100 font-semibold text-stone-900'
                          : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    onChange={handleCustomLogoUpload}
                    className="hidden"
                    id={fileInputId}
                  />
                  <label
                    htmlFor={fileInputId}
                    className="px-3.5 py-1.5 text-xs font-medium border border-stone-300 bg-[#FAF8F5] text-stone-800 rounded-lg hover:border-stone-900 cursor-pointer shadow-2xs"
                  >
                    Upload Brand Logo
                  </label>
                  {config.customLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, customLogoUrl: '', logoPreset: 'none' })}
                      className="text-xs font-mono text-rose-600 underline cursor-pointer"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Frame Tab */}
            {activeConfigTab === 'frame' && (
              <div className="space-y-4">
                <label className="block text-xs font-medium text-stone-700">
                  Card Frame Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'none', label: 'Borderless' },
                      { id: 'polaroid', label: 'Polaroid Card' },
                      { id: 'minimal-border', label: 'Clean Border' },
                      { id: 'badge-bottom', label: 'Callout Tag' },
                    ] as const
                  ).map((fr) => (
                    <button
                      key={fr.id}
                      type="button"
                      onClick={() => setConfig({ ...config, frameStyle: fr.id })}
                      className={`p-2 text-xs text-center border rounded-lg cursor-pointer ${
                        config.frameStyle === fr.id
                          ? 'border-stone-900 bg-stone-100 font-semibold text-stone-900'
                          : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      {fr.label}
                    </button>
                  ))}
                </div>

                {config.frameStyle !== 'none' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Callout Label
                    </label>
                    <input
                      type="text"
                      maxLength={24}
                      value={config.frameText}
                      onChange={(e) => setConfig({ ...config, frameText: e.target.value })}
                      placeholder="e.g. SCAN ME"
                      className="w-full px-3.5 py-2 text-xs font-mono uppercase bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Vector Preview & Exports */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bento-card p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-stone-200/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Live Preview
              </span>
              <span className="text-[11px] text-stone-400">
                {isTransparentBg ? 'Transparent Background' : 'Solid Background'}
              </span>
            </div>

            {/* Matrix Frame Container */}
            <div
              className={`p-6 rounded-2xl border border-stone-200/80 flex items-center justify-center transition-all w-full max-w-sm ${
                isTransparentBg
                  ? 'bg-[radial-gradient(#d4d4d4_1px,transparent_1px)] [background-size:16px_16px]'
                  : 'bg-[#FAF8F5]'
              }`}
            >
              <div
                className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgOutput }}
              />
            </div>

            {/* Copy / Print / Save Actions */}
            <div className="w-full grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-stone-200/60">
              <button
                type="button"
                onClick={() => handleCopyClipboard('png')}
                className="py-2 text-xs font-medium text-center border border-stone-200 hover:border-stone-900 text-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                Copy Image
              </button>
              <button
                type="button"
                onClick={() => handleCopyClipboard('svg')}
                className="py-2 text-xs font-medium text-center border border-stone-200 hover:border-stone-900 text-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                Copy SVG
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="py-2 text-xs font-medium text-center border border-stone-200 hover:border-stone-900 text-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                Print
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentQR}
                className="py-2 text-xs font-semibold text-center bg-white text-stone-800 hover:border-stone-900 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                ★ Save to Library
              </button>
              <button
                type="button"
                disabled={isSavingVault}
                onClick={handleSaveToCloudflareR2}
                className="col-span-2 py-2 text-xs font-semibold text-center bg-[#EBF1ED] text-[#2C3830] hover:bg-[#dfe9e2] border border-[#607264]/30 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>☁</span>
                <span>{isSavingVault ? 'Archiving to Vault...' : 'Archive to Cloud Vault'}</span>
              </button>
            </div>
          </div>

          {/* Export Downloads */}
          <div className="bento-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Download Options
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-stone-400 mr-1">Resolution:</span>
                {([1, 2, 4] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setExportScale(sc)}
                    className={`px-2 py-0.5 border rounded-md cursor-pointer transition-colors ${
                      exportScale === sc
                        ? 'border-stone-900 bg-stone-900 text-white font-semibold'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {sc}x
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={exporting}
                onClick={() => handleExport('svg')}
                className="py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer text-center disabled:opacity-50 shadow-xs"
              >
                Vector SVG
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => handleExport('png')}
                className="py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer text-center disabled:opacity-50 shadow-xs"
              >
                PNG Image
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => handleExport('jpeg')}
                className="py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer text-center disabled:opacity-50 shadow-xs"
              >
                JPEG Image
              </button>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Vector SVG is ideal for high-resolution printing, merchandise, and signage. PNG is optimal for web, email, and social media.
            </p>
          </div>

          {/* Saved QR Codes Library Tile */}
          {savedQRs.length > 0 && (
            <div className="bento-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                  My Saved QR Codes ({savedQRs.length})
                </span>
                <span className="text-[11px] text-stone-400">
                  Local Storage Library
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {savedQRs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#FAF8F5] border border-stone-200 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-stone-400 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-900 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded uppercase font-mono">
                          {item.contentType}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 block mt-0.5 font-mono truncate">
                        {item.payload}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreSavedQR(item)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-white border border-stone-200 hover:border-stone-900 rounded-lg transition-colors cursor-pointer text-stone-800"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedQR(item.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer text-xs"
                        title="Delete saved QR"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
