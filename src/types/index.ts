export type QRContentType =
  | 'url'
  | 'text'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'phone'
  | 'sms'
  | 'event'
  | 'geo'
  | 'crypto';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type DotStyle = 'square' | 'rounded' | 'dots' | 'squircle' | 'diamond';

export type EyeFrameStyle = 'square' | 'rounded' | 'circle';

export type EyeInnerStyle = 'square' | 'rounded' | 'dot';

export type FrameStyle = 'none' | 'polaroid' | 'minimal-border' | 'badge-bottom';

export interface QRConfig {
  errorCorrection: ErrorCorrectionLevel;
  fgColor: string;
  bgColor: string;
  dotStyle: DotStyle;
  eyeFrameStyle: EyeFrameStyle;
  eyeInnerStyle: EyeInnerStyle;
  eyeColor?: string;
  eyeInnerColor?: string;
  logoPreset: string;
  customLogoUrl?: string;
  logoSize: number;
  frameStyle: FrameStyle;
  frameText: string;
  margin: number;
}

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

export interface UrlInspectionResult {
  inputUrl: string;
  finalUrl: string;
  cleanUrl: string;
  domain: string;
  isHttps: boolean;
  isInternal: boolean;
  hops: Array<{
    step: number;
    url: string;
    status: number;
    type: string;
  }>;
  utmParams: Record<string, string>;
  trackingParams: Record<string, string>;
  queryParams: Record<string, string>;
  hasTracking: boolean;
  internalStats?: {
    clicks: number;
    createdAt: string;
    lastAccessed: string | null;
    isShielded: boolean;
    slug: string;
    title?: string;
  };
}

export interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface VCardData {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  url: string;
  street: string;
  city: string;
  country: string;
  note: string;
}

export interface EmailData {
  email: string;
  subject: string;
  body: string;
}

export interface SMSData {
  phone: string;
  message: string;
}

export interface EventData {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface GeoData {
  latitude: string;
  longitude: string;
  query: string;
}

export interface CryptoData {
  network: 'bitcoin' | 'ethereum' | 'solana';
  address: string;
  amount: string;
  label: string;
}

export type ActiveTab =
  | 'home'
  | 'studio'
  | 'router'
  | 'inspector'
  | 'about'
  | 'privacy'
  | 'contact';
