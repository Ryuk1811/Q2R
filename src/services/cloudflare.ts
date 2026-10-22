// Cloudflare Edge & R2 Serverless Architecture Service
// Enforces strict support email: duplexinterface@outlook.com

import { LinkRecord } from '../types';

export const STRICT_SUPPORT_EMAIL = 'duplexinterface@outlook.com';
export const CLOUDFLARE_R2_BUCKET = 'quick-release-vault';

export interface CloudflareEdgeStatus {
  success: boolean;
  timestamp: string;
  architecture: string;
  supportEmail: string;
  edge: {
    status: 'connected' | 'healthy' | 'offline';
    runtime: string;
    regions: string;
    routingLatency: string;
    activeLinksCount: number;
  };
  r2: {
    status: 'connected' | 'healthy' | 'ready';
    bucketName: string;
    syncedAt: string | null;
    vaultObjectsCount: number;
    telemetryBuffered: number;
  };
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  type: 'redirect' | 'shield_view' | 'url_inspection';
  slug?: string;
  targetDomain: string;
  hopsCount: number;
  trackersCleaned: number;
  edgeRouted: boolean;
}

export interface SupportInquiryPayload {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export interface SupportInquiryResponse {
  success: boolean;
  ticketId?: string;
  targetEmail: string;
  message: string;
  receiptTimestamp: string;
}

export interface QRVaultSaveResponse {
  success: boolean;
  message: string;
  filename?: string;
  publicUrl?: string;
  savedAt?: string;
}

// Client-side cache key
const CACHE_KEY = 'quickrelease_links_cache';

// Load links with client-side cache fallback
export async function fetchLinkRegistry(): Promise<LinkRecord[]> {
  try {
    const res = await fetch('/api/links');
    if (!res.ok) throw new Error('API fetch failed');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
      } catch {
        // storage quota fallback
      }
      return json.data;
    }
  } catch {
    // Read from client-side cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // return empty
    }
  }
  return [];
}

// Create new edge short link
export async function createEdgeLink(payload: {
  originalUrl: string;
  customSlug?: string;
  isShielded?: boolean;
  title?: string;
  notes?: string;
}): Promise<LinkRecord> {
  const res = await fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to create edge link');
  }

  // Update client cache
  try {
    const current = await fetchLinkRegistry();
    const updated = [json.data, ...current.filter((l: LinkRecord) => l.id !== json.data.id)];
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {}

  return json.data;
}

// Update link shield or title
export async function updateEdgeLink(
  id: string,
  payload: Partial<LinkRecord>
): Promise<LinkRecord> {
  const res = await fetch(`/api/links/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update edge link');
  }

  return json.data;
}

// Delete link
export async function deleteEdgeLink(id: string): Promise<boolean> {
  const res = await fetch(`/api/links/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to delete edge link');
  }

  try {
    const current = await fetchLinkRegistry();
    const updated = current.filter((l: LinkRecord) => l.id !== id && l.slug !== id);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {}

  return true;
}

// Save rendered QR vector to Cloudflare R2 Cloud Vault
export async function saveQRToCloudflareR2(
  title: string,
  svgContent: string,
  contentType: string,
  options?: any
): Promise<QRVaultSaveResponse> {
  const res = await fetch('/api/qr-vault/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      svgContent,
      contentType,
      options,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to archive QR asset to Cloud Vault');
  }

  return json;
}

// Dispatch support inquiry strictly targeted to duplexinterface@outlook.com
export async function dispatchSupportInquiry(
  payload: SupportInquiryPayload
): Promise<SupportInquiryResponse> {
  const res = await fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to dispatch inquiry');
  }

  return json;
}

// Fetch platform & infrastructure status
export async function getCloudflareEdgeStatus(): Promise<CloudflareEdgeStatus> {
  const res = await fetch('/api/cloud-status');
  if (!res.ok) {
    throw new Error('Failed to query system status');
  }
  return res.json();
}

// Fetch telemetry logs
export async function getRecentEdgeTelemetry(): Promise<TelemetryLogEntry[]> {
  try {
    const res = await fetch('/api/telemetry-logs');
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}
