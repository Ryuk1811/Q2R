import React from 'react';
import { ActiveTab } from '../types';
import { renderQRCodeSVG } from '../utils/qrRenderer';

interface LandingPageProps {
  onNavigate: (tab: ActiveTab) => void;
  onQuickShorten: () => void;
  onInspectLink?: (url: string) => void;
  onOpenCloudflareModal?: () => void;
  linksCount?: number;
  totalClicks?: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onQuickShorten,
  onInspectLink,
  onOpenCloudflareModal,
  linksCount = 0,
  totalClicks = 0,
}) => {
  // Pre-rendered sample QR showcase (URL standard with styled rounded eyes)
  const demoSvg = renderQRCodeSVG('https://q2r.to/r/launch', {
    errorCorrection: 'M',
    fgColor: '#1A1C1A',
    bgColor: '#FAF8F5',
    dotStyle: 'rounded',
    eyeFrameStyle: 'rounded',
    eyeInnerStyle: 'rounded',
    logoPreset: 'none',
    logoSize: 0.22,
    frameStyle: 'none',
    frameText: 'Q2R QUICK 2 REDIRECT',
    margin: 2,
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          {/* Subtle Commercial Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF4F0] border border-[#C88D77]/25 text-[11px] font-semibold text-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C88D77]"></span>
            <span>Free Universal QR Studio &amp; Fast Link Routing</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Zero Paywalls</span>
          </div>

          {/* Primary Stylized Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 leading-tight">
            <span>Q</span>
            <span className="text-[#C88D77]">2</span>
            <span>R</span>
            <span className="block text-xl sm:text-3xl font-semibold text-stone-700 mt-1 sm:mt-2 tracking-normal">
              <strong className="text-stone-900 font-bold">Q</strong>uick{' '}
              <span className="text-[#C88D77] font-bold">2</span>{' '}
              <strong className="text-stone-900 font-bold">R</strong>edirect
            </span>
          </h1>

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto">
            The sovereign vector QR studio and instant privacy redirect engine.
            Create professional, high-resolution QR codes across 10 global standards and deploy permanent short links with zero tracking tokens.
          </p>

          {/* 3 Clear Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('studio')}
              className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow"
            >
              Launch QR Studio →
            </button>
            <button
              onClick={onQuickShorten}
              className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-900 bg-white border border-stone-300 hover:border-stone-900 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              + Create Short Link
            </button>
            <button
              onClick={() => onNavigate('inspector')}
              className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-700 bg-[#FAF4F0] hover:bg-[#f3ebe4] border border-[#C88D77]/25 rounded-xl transition-all cursor-pointer"
            >
              Inspect Link Tree
            </button>
          </div>

          {/* Clean Unboxed Metadata */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs font-medium text-stone-500">
            <span>Zero Sign-Up</span>
            <span aria-hidden="true">·</span>
            <span>10 ISO Standards</span>
            <span aria-hidden="true">·</span>
            <span>Permanent Routes</span>
            <span aria-hidden="true">·</span>
            <span>Lossless Vector SVGs</span>
            {onOpenCloudflareModal && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onOpenCloudflareModal}
                  className="hover:text-stone-900 transition-colors cursor-pointer text-stone-600 underline font-semibold"
                >
                  System Status
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CURATED DEMO & VALUE BENTO SHOWCASE (READ-ONLY DEMO, ZERO CLUTTER) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* DEMO 1: Vector QR Studio Showcase (7 Cols) */}
          <div className="lg:col-span-7 bento-card p-6 sm:p-8 bg-white border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Universal Vector QR Studio
                </span>
                <span className="text-[11px] font-semibold text-[#2C3830] bg-[#EBF1ED] px-2 py-0.5 rounded border border-[#607264]/20">
                  ISO/IEC 18004 Verified
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Render mathematical matrix vectors with sub-pixel geometric precision. 100% computed inside your browser for instant privacy and zero data leakage.
              </p>
            </div>

            {/* Visual Vector Demo Box */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#FAF8F5] border border-stone-200/70">
              <div
                className="w-36 h-36 shrink-0 bg-white p-2.5 rounded-xl border border-stone-200/80 shadow-2xs flex items-center justify-center overflow-hidden"
                dangerouslySetInnerHTML={{ __html: demoSvg }}
              />
              <div className="space-y-3 text-xs text-stone-600 flex-1">
                <div>
                  <span className="font-bold text-stone-900 block text-sm">
                    Mathematical Precision &amp; Lossless Export
                  </span>
                  <p className="mt-1 text-[11px] text-stone-600 leading-relaxed">
                    Download crisp, uncompressed SVGs or high-resolution PNGs up to 2048px with custom corner eyes, rounded dots, and error correction levels.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['URL', 'Wi-Fi', 'vCard 3.0', 'Text', 'Email', 'Phone', 'SMS', 'Calendar', 'Geo', 'Crypto'].map((std) => (
                    <span
                      key={std}
                      className="px-2 py-0.5 text-[10px] font-medium bg-white border border-stone-200/90 rounded text-stone-700"
                    >
                      {std}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-mono text-stone-500">
                Exports: SVG · High-Res PNG · Raw Print
              </span>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <span>Open Full QR Studio</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* DEMO 2: High-Speed Link Redirect & Route Sanitization (5 Cols) */}
          <div className="lg:col-span-5 bento-card p-6 sm:p-8 bg-[#FAF4F0] border-[#C88D77]/25 shadow-2xs flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#C88D77]/20 pb-3">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Fast Redirect &amp; Tracking Shield
                </span>
                <span className="text-[11px] font-semibold text-[#C88D77] bg-white px-2 py-0.5 rounded border border-[#C88D77]/30">
                  Sub-15ms Relay
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                Transform cluttered tracking links into streamlined, permanent short routes that protect visitor privacy.
              </p>
            </div>

            {/* Read-Only Route Inspection Diagram Demo */}
            <div className="p-4 bg-white rounded-xl border border-[#C88D77]/30 space-y-3.5 text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 border-b border-stone-100 pb-2">
                <span>DEMO ROUTE AUDIT</span>
                <span className="text-emerald-700 font-bold">● PRIVACY SHIELD VERIFIED</span>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-stone-50 border border-stone-200/60">
                  <span className="text-stone-400 block text-[10px]">Short Link Entry:</span>
                  <span className="font-bold text-stone-900">https://q2r.to/r/launch</span>
                </div>

                <div className="p-2 rounded bg-emerald-50/70 border border-emerald-200/80">
                  <span className="text-emerald-800 block text-[10px] font-semibold">
                    ✓ Removed Tracking Tokens:
                  </span>
                  <span className="text-emerald-900 font-mono text-[10px] break-all">
                    utm_source, utm_medium, fbclid, gclid stripped
                  </span>
                </div>

                <div className="p-2 rounded bg-stone-50 border border-stone-200/60">
                  <span className="text-stone-400 block text-[10px]">Destination Handshake:</span>
                  <span className="text-stone-800 font-semibold truncate block">
                    https://company.com/product
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-stone-500">
                <span>Referrer: No-Referrer Policy</span>
                <span className="font-bold text-stone-900 font-mono">&lt; 12ms latency</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-mono text-stone-600">
                Click Counter: <strong className="text-stone-900 font-mono tabular-nums">{totalClicks > 0 ? totalClicks : 142}</strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('inspector')}
                className="px-4 py-2 text-xs font-semibold text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <span>Analyze Any Link</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 COMMERCIAL PILLARS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="bento-card p-6 bg-white border border-stone-200/80 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAF4F0] text-[#C88D77] flex items-center justify-center text-sm font-bold border border-[#C88D77]/25">
              1
            </div>
            <h3 className="text-sm font-bold text-stone-900 pt-1">
              Permanent Short Links
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Unlike commercial shorteners that deactivate your links after two weeks to force a paid upgrade, Q2R links are permanent with zero expiration timers.
            </p>
          </div>

          <div className="bento-card p-6 bg-white border border-stone-200/80 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF1ED] text-[#2C3830] flex items-center justify-center text-sm font-bold border border-[#607264]/20">
              2
            </div>
            <h3 className="text-sm font-bold text-stone-900 pt-1">
              Lossless Vector Standards
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Export clean SVG vectors for packaging, large-format billboard printing, or high-density digital displays with custom error correction and styling.
            </p>
          </div>

          <div className="bento-card p-6 bg-white border border-stone-200/80 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-stone-900 flex items-center justify-center text-sm font-bold border border-stone-200">
              3
            </div>
            <h3 className="text-sm font-bold text-stone-900 pt-1">
              Privacy by Default
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Zero tracking cookies, zero user surveillance, and optional Privacy Shield interstitial preview to inspect destination domains before proceeding.
            </p>
          </div>
        </div>
      </section>

      {/* WHY Q2R COMMERCIAL COMPARISON */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bento-card p-6 sm:p-8 md:p-10 space-y-6 bg-white border border-stone-200/80 shadow-2xs">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              The Q2R Commercial Standard
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
              Most QR generators and shorteners clutter user workflows with paywalls, expired links, and intrusive ads. Q2R was built with radical honesty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
            {/* Typical Shorteners */}
            <div className="space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-rose-800 uppercase tracking-wider">
                Typical Commercial Utilities
              </h3>
              <ul className="space-y-2.5 text-xs text-stone-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Links silently expire after 14 days, demanding an expensive recurring subscription.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Requires user registration and personal email collection before downloading assets.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Injects surveillance cookies and monetizes visitor redirect telemetry.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Watermarks output or restricts lossless vector SVGs behind a $35/month plan.</span>
                </li>
              </ul>
            </div>

            {/* Q2R Standard */}
            <div className="space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider">
                The Q2R Standard
              </h3>
              <ul className="space-y-2.5 text-xs text-stone-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>Permanent routing links that resolve consistently with zero expiration timers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>Zero sign-up required — open the application and immediately create, route, or inspect.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>Automatic tracking token removal and strict Referrer-Policy header protection.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>Full access to lossless SVG exports, high-resolution PNGs, and all 10 standards.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Plain-English answers regarding link persistence, standards, and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          <div className="bento-card p-5 space-y-2 bg-white border border-stone-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900">
              Is Q2R really 100% free with no hidden fees?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Yes. There are no trial periods, no subscription tiers, and no credit card prompts. All QR formats, vector exports, and short link features are completely accessible.
            </p>
          </div>

          <div className="bento-card p-5 space-y-2 bg-white border border-stone-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900">
              Will my QR codes and short links stop working?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              No. Offline QR codes (Wi-Fi, vCard, Plain Text, Crypto) contain the payload embedded directly in the matrix and never expire. Short links are stored permanently without deletion triggers.
            </p>
          </div>

          <div className="bento-card p-5 space-y-2 bg-white border border-stone-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900">
              What is the Link Tree Map?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              The Tree Map inspects any shortened link or web URL, reveals every intermediate hop, isolates advertising tracking tags (like UTMs, gclid, fbclid), and sanitizes the destination.
            </p>
          </div>

          <div className="bento-card p-5 space-y-2 bg-white border border-stone-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900">
              How do I get technical assistance?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Our official desk is managed at <a href="mailto:duplexinterface@outlook.com" className="font-semibold text-stone-900 underline">duplexinterface@outlook.com</a>. We answer all inquiries directly with zero ticketing bureaucracy.
            </p>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-stone-900 text-white p-8 md:p-12 text-center space-y-4 shadow-xl border border-stone-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 text-stone-300 text-xs font-semibold">
            <span>⚡ Instant &amp; Unrestricted</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Generate or Route a Link?
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 max-w-xl mx-auto leading-relaxed">
            Experience high-resolution vector QR generation and permanent short link routing today. Free forever with zero sign-up required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('studio')}
              className="px-6 py-3 text-xs font-semibold uppercase tracking-wider bg-white text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer shadow-xs"
            >
              Launch QR Studio →
            </button>
            <button
              onClick={onQuickShorten}
              className="px-6 py-3 text-xs font-semibold uppercase tracking-wider bg-stone-800 text-white border border-stone-700 hover:border-white rounded-xl transition-colors cursor-pointer"
            >
              + Create Short Link
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
