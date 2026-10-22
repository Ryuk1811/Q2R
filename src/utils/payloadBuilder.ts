import {
  CryptoData,
  EmailData,
  EventData,
  GeoData,
  QRContentType,
  SMSData,
  VCardData,
  WifiData,
} from '../types';

export function buildQRPayload(
  type: QRContentType,
  state: {
    urlText: string;
    plainText: string;
    wifi: WifiData;
    vcard: VCardData;
    email: EmailData;
    phone: string;
    sms: SMSData;
    event: EventData;
    geo: GeoData;
    crypto: CryptoData;
  }
): string {
  switch (type) {
    case 'url': {
      let url = state.urlText.trim();
      if (!url) return 'https://quickrelease.io';
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      return url;
    }

    case 'text': {
      return state.plainText || 'Q2R (Quick 2 Redirect) Sovereign Vector QR';
    }

    case 'wifi': {
      const { ssid, password, encryption, hidden } = state.wifi;
      const cleanSSID = ssid.replace(/([\\;,:"])/g, '\\$1');
      const cleanPass = password.replace(/([\\;,:"])/g, '\\$1');
      const auth = encryption === 'nopass' ? 'nopass' : encryption;
      return `WIFI:S:${cleanSSID};T:${auth};P:${cleanPass};H:${hidden ? 'true' : 'false'};;`;
    }

    case 'vcard': {
      const v = state.vcard;
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${v.lastName || ''};${v.firstName || ''};;;`,
        `FN:${[v.firstName, v.lastName].filter(Boolean).join(' ') || 'Contact'}`,
      ];
      if (v.organization) lines.push(`ORG:${v.organization}`);
      if (v.title) lines.push(`TITLE:${v.title}`);
      if (v.phone) lines.push(`TEL;TYPE=CELL:${v.phone}`);
      if (v.email) lines.push(`EMAIL:${v.email}`);
      if (v.url) lines.push(`URL:${/^https?:\/\//i.test(v.url) ? v.url : `https://${v.url}`}`);
      if (v.street || v.city || v.country) {
        lines.push(`ADR;TYPE=WORK:;;${v.street || ''};${v.city || ''};;${v.country || ''}`);
      }
      if (v.note) lines.push(`NOTE:${v.note}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    case 'email': {
      const { email, subject, body } = state.email;
      if (!email) return 'mailto:';
      const params = new URLSearchParams();
      if (subject) params.append('subject', subject);
      if (body) params.append('body', body);
      const query = params.toString();
      return `mailto:${email}${query ? `?${query}` : ''}`;
    }

    case 'phone': {
      const p = state.phone.trim();
      return p ? `tel:${p}` : 'tel:+10000000000';
    }

    case 'sms': {
      const { phone, message } = state.sms;
      return `smsto:${phone || ''}:${message || ''}`;
    }

    case 'event': {
      const ev = state.event;
      const formatDT = (dStr: string) => {
        if (!dStr) return '';
        try {
          const d = new Date(dStr);
          return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        } catch {
          return '';
        }
      };

      const start = formatDT(ev.startDate) || '20261020T100000Z';
      const end = formatDT(ev.endDate) || '20261020T110000Z';

      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//KURA//QR Calendar Event//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${ev.title || 'New Event'}`,
        `LOCATION:${ev.location || ''}`,
        `DESCRIPTION:${ev.description || ''}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\n');
    }

    case 'geo': {
      const { latitude, longitude, query } = state.geo;
      if (query.trim()) {
        return `https://maps.google.com/?q=${encodeURIComponent(query.trim())}`;
      }
      const lat = latitude.trim() || '46.9480';
      const lng = longitude.trim() || '7.4474';
      return `geo:${lat},${lng}?q=${lat},${lng}`;
    }

    case 'crypto': {
      const { network, address, amount, label } = state.crypto;
      const addr = address.trim() || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const params = new URLSearchParams();
      if (amount.trim()) params.append('amount', amount.trim());
      if (label.trim()) params.append('label', label.trim());
      const q = params.toString();

      switch (network) {
        case 'ethereum':
          return `ethereum:${addr}${q ? `?${q}` : ''}`;
        case 'solana':
          return `solana:${addr}${q ? `?${q}` : ''}`;
        case 'bitcoin':
        default:
          return `bitcoin:${addr}${q ? `?${q}` : ''}`;
      }
    }

    default:
      return 'https://quickrelease.io';
  }
}
