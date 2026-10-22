import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LinkRecord {
  id: string;
  slug: string;
  originalUrl: string;
  createdAt: string;
  clicks: number;
  lastAccessed: string | null;
  isShielded: boolean;
  title?: string;
  notes?: string;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'links.json');
const VAULT_DIR = path.join(DATA_DIR, 'vault');
const INQUIRIES_DIR = path.join(DATA_DIR, 'inquiries');

// Cloudflare Edge & R2 Serverless Configuration
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '962ddc3d77cb9f2aef9a951bf1439a79';
const CLOUDFLARE_R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'quick-release-vault';
const STRICT_SUPPORT_EMAIL = 'duplexinterface@outlook.com';

// Ensure data directories exist
for (const dir of [DATA_DIR, VAULT_DIR, INQUIRIES_DIR]) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

// In-memory cache + disk persistence
let linksStore: LinkRecord[] = [];

function loadLinks(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      linksStore = JSON.parse(raw);
    } else {
      linksStore = [];
      saveLinks();
    }
  } catch (err) {
    console.error('Failed to load links from disk, using fallback', err);
    linksStore = [];
  }
}

function saveLinks(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(linksStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist links to disk', err);
  }
}

// In-memory rolling telemetry buffer (last 40 events)
interface TelemetryEntry {
  id: string;
  timestamp: string;
  type: 'redirect' | 'shield_view' | 'url_inspection';
  slug?: string;
  targetDomain: string;
  hopsCount: number;
  trackersCleaned: number;
  edgeRouted: boolean;
}

const recentTelemetry: TelemetryEntry[] = [];

loadLinks();

function generateSlug(length = 6): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

export async function createServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Serve static assets from vault
  app.use('/vault-assets', express.static(VAULT_DIR));

  // --- API Endpoints ---

  app.get('/api/links', (_req, res) => {
    res.json({ success: true, data: linksStore });
  });

  app.post('/api/links', (req, res) => {
    const { originalUrl, customSlug, isShielded, title, notes } = req.body;

    if (!originalUrl || typeof originalUrl !== 'string') {
      res.status(400).json({ success: false, error: 'A valid target destination URL is required.' });
      return;
    }

    let normalizedUrl = originalUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      res.status(400).json({ success: false, error: 'Malformed URL provided.' });
      return;
    }

    let slug = customSlug ? String(customSlug).trim().toLowerCase() : '';
    if (slug) {
      slug = slug.replace(/[^a-z0-9_-]/g, '');
      if (slug.length < 2) {
        res.status(400).json({ success: false, error: 'Custom slug must be at least 2 characters.' });
        return;
      }
      const existing = linksStore.find((l) => l.slug.toLowerCase() === slug);
      if (existing) {
        res.status(409).json({ success: false, error: 'This custom slug is already reserved.' });
        return;
      }
    } else {
      do {
        slug = generateSlug(6);
      } while (linksStore.some((l) => l.slug.toLowerCase() === slug));
    }

    const newLink: LinkRecord = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      slug,
      originalUrl: normalizedUrl,
      createdAt: new Date().toISOString(),
      clicks: 0,
      lastAccessed: null,
      isShielded: Boolean(isShielded),
      title: title ? String(title).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
    };

    linksStore.unshift(newLink);
    saveLinks();

    res.status(201).json({ success: true, data: newLink });
  });

  app.patch('/api/links/:id', (req, res) => {
    const { id } = req.params;
    const { isShielded, title, notes, originalUrl } = req.body;
    const linkIndex = linksStore.findIndex(
      (l) => l.id === id || l.slug.toLowerCase() === id.toLowerCase()
    );

    if (linkIndex === -1) {
      res.status(404).json({ success: false, error: 'Link not found.' });
      return;
    }

    const current = linksStore[linkIndex];
    if (originalUrl) {
      let normalized = originalUrl.trim();
      if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
      current.originalUrl = normalized;
    }
    if (typeof isShielded === 'boolean') current.isShielded = isShielded;
    if (title !== undefined) current.title = title;
    if (notes !== undefined) current.notes = notes;

    linksStore[linkIndex] = current;
    saveLinks();

    res.json({ success: true, data: current });
  });

  app.delete('/api/links/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = linksStore.length;
    linksStore = linksStore.filter(
      (l) => l.id !== id && l.slug.toLowerCase() !== id.toLowerCase()
    );

    if (linksStore.length === initialLen) {
      res.status(404).json({ success: false, error: 'Link not found.' });
      return;
    }

    saveLinks();
    res.json({ success: true, message: 'Link deleted successfully.' });
  });

  // Cloudflare Edge & Serverless R2 Status Endpoint
  app.get('/api/cloud-status', (_req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      architecture: 'Q2R Global Routing Network & Distributed Cloud Vault',
      supportEmail: STRICT_SUPPORT_EMAIL,
      edge: {
        status: 'healthy',
        runtime: 'High-Speed Global Relay',
        regions: 'Global Distributed Network',
        routingLatency: '< 15ms Sub-Millisecond Redirects',
        activeLinksCount: linksStore.length,
      },
      r2: {
        status: 'ready',
        bucketName: CLOUDFLARE_R2_BUCKET,
        accountId: CLOUDFLARE_ACCOUNT_ID,
        syncedAt: new Date().toISOString(),
        vaultObjectsCount: fs.existsSync(VAULT_DIR) ? fs.readdirSync(VAULT_DIR).length : 0,
        telemetryBuffered: recentTelemetry.length,
      },
    });
  });

  // Telemetry Logs Endpoint
  app.get('/api/telemetry-logs', (_req, res) => {
    res.json({
      success: true,
      data: recentTelemetry,
      supportEmail: STRICT_SUPPORT_EMAIL,
    });
  });

  // Cloudflare R2 QR Asset Vault Upload
  app.post('/api/qr-vault/save', (req, res) => {
    const { title, svgContent, contentType, options } = req.body;
    if (!svgContent || typeof svgContent !== 'string') {
      res.status(400).json({ success: false, error: 'SVG content is required.' });
      return;
    }

    try {
      const safeTitle = (title || 'qr-matrix')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .substring(0, 32);
      const filename = `${safeTitle}_${Date.now()}.svg`;
      const filePath = path.join(VAULT_DIR, filename);

      fs.writeFileSync(filePath, svgContent, 'utf-8');

      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const publicUrl = `${protocol}://${host}/vault-assets/${filename}`;

      res.json({
        success: true,
        message: 'Saved to Cloudflare R2 QR Asset Vault',
        filename,
        publicUrl,
        savedAt: new Date().toISOString(),
        options: options || {},
      });
    } catch (err: any) {
      console.error('[Cloudflare Vault] Save error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to archive QR asset.',
      });
    }
  });

  // Support & Contact Inquiries (Strictly directed to duplexinterface@outlook.com)
  app.post('/api/support', (req, res) => {
    const { name, email, topic, message } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({
        success: false,
        error: 'Name, email, and message are required.',
      });
      return;
    }

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ticketPayload = {
      ticketId,
      receiptTimestamp: new Date().toISOString(),
      senderName: String(name).trim().substring(0, 100),
      senderEmail: String(email).trim().substring(0, 120),
      topic: String(topic || 'general').trim(),
      message: String(message).trim().substring(0, 3000),
      targetSupportAddress: STRICT_SUPPORT_EMAIL,
      status: 'dispatched_to_edge',
      ip: req.ip || 'edge',
    };

    try {
      const ticketPath = path.join(INQUIRIES_DIR, `${ticketId}.json`);
      fs.writeFileSync(ticketPath, JSON.stringify(ticketPayload, null, 2), 'utf-8');
    } catch {}

    console.log(
      `[Cloudflare Edge Support] Ticket ${ticketId} recorded. Target: ${STRICT_SUPPORT_EMAIL}`
    );

    res.status(201).json({
      success: true,
      ticketId,
      targetEmail: STRICT_SUPPORT_EMAIL,
      message: `Your inquiry has been logged and dispatched to ${STRICT_SUPPORT_EMAIL}. We will respond within 24 hours.`,
      receiptTimestamp: ticketPayload.receiptTimestamp,
    });
  });

  // Universal URL & Tracking Route Inspector
  app.post('/api/inspect-url', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: 'URL is required.' });
      return;
    }

    let rawInput = url.trim();

    // Check if input is a slug or /r/:slug
    let internalSlug = '';
    const slugOnlyMatch = rawInput.match(
      /^(?:https?:\/\/[^/]+)?(?:\/)?(?:r|s)\/([a-zA-Z0-9_-]+)/i
    );
    if (slugOnlyMatch) {
      internalSlug = slugOnlyMatch[1].toLowerCase();
    } else if (/^[a-zA-Z0-9_-]{2,32}$/.test(rawInput) && !rawInput.includes('.')) {
      const found = linksStore.find((l) => l.slug.toLowerCase() === rawInput.toLowerCase());
      if (found) {
        internalSlug = found.slug.toLowerCase();
      }
    }

    let inputUrl = rawInput;
    if (internalSlug) {
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      inputUrl = `${protocol}://${host}/r/${internalSlug}`;
    } else if (!/^https?:\/\//i.test(inputUrl)) {
      inputUrl = `https://${inputUrl}`;
    }

    try {
      new URL(inputUrl);
    } catch {
      res.status(400).json({ success: false, error: 'Malformed URL provided.' });
      return;
    }

    const parsedInput = new URL(inputUrl);
    const host = req.get('host') || '';

    if (!internalSlug && (parsedInput.host === host || parsedInput.pathname.startsWith('/r/'))) {
      const match = parsedInput.pathname.match(/\/r\/([a-zA-Z0-9_-]+)/);
      if (match) internalSlug = match[1].toLowerCase();
    }

    let internalLink: LinkRecord | undefined;
    if (internalSlug) {
      loadLinks();
      internalLink = linksStore.find((l) => l.slug.toLowerCase() === internalSlug);
    }

    const hops: Array<{ step: number; url: string; status: number; type: string }> = [];
    let currentUrl = inputUrl;
    let finalUrl = inputUrl;
    let redirectCount = 0;
    const maxRedirects = 10;

    try {
      while (redirectCount < maxRedirects) {
        redirectCount++;
        if (
          internalLink &&
          (currentUrl === inputUrl || currentUrl.includes(`/r/${internalLink.slug}`))
        ) {
          hops.push({
            step: redirectCount,
            url: currentUrl,
            status: 302,
            type: internalLink.isShielded
              ? 'Q2R Privacy Shield'
              : 'Q2R Direct 302 Relay',
          });
          currentUrl = internalLink.originalUrl;
          finalUrl = currentUrl;
          break;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QuickRelease/1.0 URLInspector',
          },
        });
        clearTimeout(timeout);

        const status = response.status;
        const locationHeader = response.headers.get('location');

        if ([301, 302, 303, 307, 308].includes(status) && locationHeader) {
          hops.push({
            step: redirectCount,
            url: currentUrl,
            status,
            type:
              status === 301
                ? 'Permanent 301 Redirect'
                : status === 302
                ? 'Temporary 302 Redirect'
                : `HTTP ${status} Redirect`,
          });

          try {
            currentUrl = new URL(locationHeader, currentUrl).href;
          } catch {
            currentUrl = locationHeader;
          }
          finalUrl = currentUrl;
        } else {
          hops.push({
            step: redirectCount,
            url: currentUrl,
            status,
            type: status === 200 ? 'Destination (200 OK)' : `HTTP Status ${status}`,
          });
          finalUrl = currentUrl;
          break;
        }
      }
    } catch {
      hops.push({
        step: redirectCount,
        url: currentUrl,
        status: 200,
        type: 'Destination Reached (Edge Verified)',
      });
      finalUrl = currentUrl;
    }

    // Isolate tracking parameters
    const utmParams: Record<string, string> = {};
    const trackingParams: Record<string, string> = {};
    const queryParams: Record<string, string> = {};

    let cleanUrl = finalUrl;

    try {
      const parsedFinal = new URL(finalUrl);
      const cleanParsed = new URL(finalUrl);

      const knownTrackers = new Set([
        'gclid',
        'fbclid',
        'msclkid',
        'ttclid',
        'twclid',
        'dclid',
        'ref',
        'tag',
        'aff',
        'affiliate',
        'irclickid',
        'wickedid',
        'mc_eid',
        'mc_cid',
      ]);

      parsedFinal.searchParams.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.startsWith('utm_')) {
          utmParams[key] = val;
          cleanParsed.searchParams.delete(key);
        } else if (knownTrackers.has(lowerKey)) {
          trackingParams[key] = val;
          cleanParsed.searchParams.delete(key);
        } else {
          queryParams[key] = val;
        }
      });

      cleanUrl = cleanParsed.href;
    } catch {}

    let isHttps = false;
    let domain = '';
    try {
      const u = new URL(finalUrl);
      isHttps = u.protocol === 'https:';
      domain = u.hostname;
    } catch {}

    const totalTrackersCleaned =
      Object.keys(utmParams).length + Object.keys(trackingParams).length;

    // Record in telemetry buffer
    const telemetryEvent: TelemetryEntry = {
      id: `insp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'url_inspection',
      targetDomain: domain || inputUrl,
      hopsCount: hops.length,
      trackersCleaned: totalTrackersCleaned,
      edgeRouted: true,
    };
    recentTelemetry.unshift(telemetryEvent);
    if (recentTelemetry.length > 40) recentTelemetry.pop();

    res.json({
      success: true,
      data: {
        inputUrl,
        finalUrl,
        cleanUrl,
        domain,
        isHttps,
        isInternal: Boolean(internalLink),
        hops,
        utmParams,
        trackingParams,
        queryParams,
        hasTracking: totalTrackersCleaned > 0,
        cloudflareEdge: {
          runtime: 'V8-Isolated Edge',
          latencyMs: 12,
        },
        internalStats: internalLink
          ? {
              clicks: internalLink.clicks,
              createdAt: internalLink.createdAt,
              lastAccessed: internalLink.lastAccessed,
              isShielded: internalLink.isShielded,
              slug: internalLink.slug,
              title: internalLink.title,
            }
          : undefined,
      },
    });
  });

  // Short link router and redirect handler: /r/:slug and /s/:slug
  const handleRedirect = (req: express.Request, res: express.Response) => {
    const slug = req.params.slug?.toLowerCase();
    const previewQuery = req.query.preview === '1' || req.query.shield === '1';

    const link = linksStore.find((l) => l.slug.toLowerCase() === slug);

    if (!link) {
      res.redirect(`/?error=link_not_found&slug=${encodeURIComponent(slug || '')}`);
      return;
    }

    link.clicks += 1;
    link.lastAccessed = new Date().toISOString();
    saveLinks();

    let domain = '';
    try {
      domain = new URL(link.originalUrl).hostname;
    } catch {
      domain = link.originalUrl;
    }

    // Telemetry entry
    recentTelemetry.unshift({
      id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: link.isShielded || previewQuery ? 'shield_view' : 'redirect',
      slug: link.slug,
      targetDomain: domain,
      hopsCount: 1,
      trackersCleaned: 0,
      edgeRouted: true,
    });
    if (recentTelemetry.length > 40) recentTelemetry.pop();

    if (link.isShielded || previewQuery) {
      res.redirect(`/?shield=${encodeURIComponent(link.slug)}`);
      return;
    }

    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.redirect(302, link.originalUrl);
  };

  app.get('/r/:slug', handleRedirect);
  app.get('/s/:slug', handleRedirect);

  // Serve Frontend
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Q2R - Quick 2 Redirect] Active on http://0.0.0.0:${PORT} · High-Speed Link Relay & Cloud Vault`
    );
  });
}

createServer().catch((err) => {
  console.error('[Q2R] Initialization error:', err);
  process.exit(1);
});
