import QRCode from 'qrcode';
import { QRConfig } from '../types';

interface MatrixInfo {
  size: number;
  isDark: (row: number, col: number) => boolean;
}

export function generateMatrix(text: string, errorCorrection: QRConfig['errorCorrection']): MatrixInfo {
  try {
    const qr = QRCode.create(text, {
      errorCorrectionLevel: errorCorrection,
    });
    const size = qr.modules.size;
    const data = qr.modules.data;

    return {
      size,
      isDark: (row: number, col: number) => {
        if (row < 0 || row >= size || col < 0 || col >= size) return false;
        return Boolean(data[row * size + col]);
      },
    };
  } catch (err) {
    console.error('QR Matrix creation error:', err);
    // Fallback minimal matrix
    return {
      size: 21,
      isDark: () => false,
    };
  }
}

// Preset icon SVGs for center badge
export const PRESET_ICONS: Record<string, string> = {
  link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  wifi: `<path d="M5 13a10 10 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8.5 16.5a5 5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2 8.82a15 15 0 0 1 20 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="20" x2="12.01" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  card: `<rect width="20" height="14" x="2" y="5" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="2" x2="22" y1="10" y2="10" stroke="currentColor" stroke-width="2"/>`,
  mail: `<rect width="20" height="16" x="2" y="4" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" fill="none" stroke="currentColor" stroke-width="2"/>`,
  phone: `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  globe: `<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12h20" fill="none" stroke="currentColor" stroke-width="2"/>`,
  github: `<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 18c-4.51 2-5-2-7-2" fill="none" stroke="currentColor" stroke-width="2"/>`,
};

export function renderQRCodeSVG(text: string, config: QRConfig): string {
  const {
    errorCorrection,
    fgColor,
    bgColor,
    dotStyle,
    eyeFrameStyle,
    eyeInnerStyle,
    eyeColor = fgColor,
    eyeInnerColor = eyeColor || fgColor,
    logoPreset,
    customLogoUrl,
    logoSize = 0.22,
    frameStyle = 'none',
    frameText = 'SCAN ME',
    margin = 3,
  } = config;

  const matrix = generateMatrix(text, errorCorrection);
  const size = matrix.size;

  const hasLogo = (logoPreset && logoPreset !== 'none') || Boolean(customLogoUrl);
  const centerCoord = Math.floor(size / 2);
  const logoRadius = hasLogo ? Math.max(2, Math.floor((size * logoSize) / 2)) : 0;

  const isFinderEye = (r: number, c: number) => {
    // Top-Left 7x7 (plus 1px border)
    if (r <= 7 && c <= 7) return true;
    // Top-Right
    if (r <= 7 && c >= size - 8) return true;
    // Bottom-Left
    if (r >= size - 8 && c <= 7) return true;
    return false;
  };

  const isCenterLogoArea = (r: number, c: number) => {
    if (!hasLogo) return false;
    return Math.abs(r - centerCoord) <= logoRadius && Math.abs(c - centerCoord) <= logoRadius;
  };

  // Dimensions
  const qrTotalSize = size + margin * 2;
  const unitSize = 10;
  const qrPixelWidth = qrTotalSize * unitSize;

  let canvasWidth = qrPixelWidth;
  let canvasHeight = qrPixelWidth;
  let qrOffsetY = 0;

  if (frameStyle === 'polaroid') {
    canvasHeight = qrPixelWidth + 90;
    qrOffsetY = 14;
  } else if (frameStyle === 'badge-bottom') {
    canvasHeight = qrPixelWidth + 48;
    qrOffsetY = 0;
  } else if (frameStyle === 'minimal-border') {
    canvasWidth = qrPixelWidth + 24;
    canvasHeight = qrPixelWidth + (frameText.trim() ? 56 : 24);
    qrOffsetY = 12;
  }

  const paths: string[] = [];

  // Render Data Modules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFinderEye(r, c)) continue;
      if (isCenterLogoArea(r, c)) continue;

      if (matrix.isDark(r, c)) {
        const x = (c + margin) * unitSize + (frameStyle === 'minimal-border' ? 12 : 0);
        const y = (r + margin) * unitSize + qrOffsetY;

        if (dotStyle === 'rounded') {
          paths.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${unitSize - 1}" height="${unitSize - 1}" rx="${(unitSize - 1) * 0.35}" ry="${(unitSize - 1) * 0.35}" fill="${fgColor}" />`);
        } else if (dotStyle === 'dots') {
          const cx = x + unitSize / 2;
          const cy = y + unitSize / 2;
          paths.push(`<circle cx="${cx}" cy="${cy}" r="${unitSize * 0.43}" fill="${fgColor}" />`);
        } else if (dotStyle === 'squircle') {
          paths.push(`<rect x="${x + 0.8}" y="${y + 0.8}" width="${unitSize - 1.6}" height="${unitSize - 1.6}" rx="${(unitSize - 1.6) * 0.48}" fill="${fgColor}" />`);
        } else if (dotStyle === 'diamond') {
          const cx = x + unitSize / 2;
          const cy = y + unitSize / 2;
          const d = unitSize * 0.46;
          paths.push(`<polygon points="${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}" fill="${fgColor}" />`);
        } else {
          // square
          paths.push(`<rect x="${x}" y="${y}" width="${unitSize}" height="${unitSize}" fill="${fgColor}" />`);
        }
      }
    }
  }

  // Helper to draw eye pattern
  const drawCornerEye = (startRow: number, startCol: number) => {
    const x = (startCol + margin) * unitSize + (frameStyle === 'minimal-border' ? 12 : 0);
    const y = (startRow + margin) * unitSize + qrOffsetY;
    const eyeSize = 7 * unitSize;
    const center = eyeSize / 2;

    // Outer Frame (7x7)
    if (eyeFrameStyle === 'circle') {
      const radius = center - unitSize / 2;
      paths.push(
        `<circle cx="${x + center}" cy="${y + center}" r="${radius}" fill="none" stroke="${eyeColor}" stroke-width="${unitSize}" />`
      );
    } else if (eyeFrameStyle === 'rounded') {
      const pad = unitSize / 2;
      paths.push(
        `<rect x="${x + pad}" y="${y + pad}" width="${eyeSize - unitSize}" height="${eyeSize - unitSize}" rx="${unitSize * 1.8}" ry="${unitSize * 1.8}" fill="none" stroke="${eyeColor}" stroke-width="${unitSize}" />`
      );
    } else {
      // square
      const pad = unitSize / 2;
      paths.push(
        `<rect x="${x + pad}" y="${y + pad}" width="${eyeSize - unitSize}" height="${eyeSize - unitSize}" fill="none" stroke="${eyeColor}" stroke-width="${unitSize}" />`
      );
    }

    // Inner Eyeball (3x3 at center)
    const innerX = x + 2 * unitSize;
    const innerY = y + 2 * unitSize;
    const innerDimension = 3 * unitSize;

    if (eyeInnerStyle === 'dot' || eyeFrameStyle === 'circle') {
      paths.push(
        `<circle cx="${x + center}" cy="${y + center}" r="${unitSize * 1.45}" fill="${eyeInnerColor}" />`
      );
    } else if (eyeInnerStyle === 'rounded') {
      paths.push(
        `<rect x="${innerX}" y="${innerY}" width="${innerDimension}" height="${innerDimension}" rx="${unitSize * 0.8}" ry="${unitSize * 0.8}" fill="${eyeInnerColor}" />`
      );
    } else {
      // square
      paths.push(
        `<rect x="${innerX}" y="${innerY}" width="${innerDimension}" height="${innerDimension}" fill="${eyeInnerColor}" />`
      );
    }
  };

  // Draw 3 Corner Finder Eyes
  drawCornerEye(0, 0); // Top-Left
  drawCornerEye(0, size - 7); // Top-Right
  drawCornerEye(size - 7, 0); // Bottom-Left

  // Draw Center Logo / Watermark
  if (hasLogo) {
    const centerPxX = (centerCoord + margin) * unitSize + unitSize / 2 + (frameStyle === 'minimal-border' ? 12 : 0);
    const centerPxY = (centerCoord + margin) * unitSize + unitSize / 2 + qrOffsetY;
    const badgeDiameter = (logoRadius * 2 + 1.6) * unitSize;
    const badgeRadius = badgeDiameter / 2;
    const iconDimension = badgeDiameter * 0.62;

    const badgeBg = bgColor === 'transparent' ? '#ffffff' : bgColor;
    // Badge Background with hairline outline
    paths.push(
      `<circle cx="${centerPxX}" cy="${centerPxY}" r="${badgeRadius}" fill="${badgeBg}" stroke="${fgColor}" stroke-opacity="0.12" stroke-width="1.5" />`
    );

    if (customLogoUrl) {
      paths.push(
        `<image href="${customLogoUrl}" x="${centerPxX - iconDimension / 2}" y="${centerPxY - iconDimension / 2}" width="${iconDimension}" height="${iconDimension}" preserveAspectRatio="xMidYMid meet" />`
      );
    } else if (logoPreset && PRESET_ICONS[logoPreset]) {
      const iconX = centerPxX - iconDimension / 2;
      const iconY = centerPxY - iconDimension / 2;
      paths.push(
        `<g transform="translate(${iconX}, ${iconY}) scale(${iconDimension / 24})" color="${fgColor}">
          ${PRESET_ICONS[logoPreset]}
        </g>`
      );
    }
  }

  // Draw Frame and Callout Typography
  let frameBackground = '';
  let frameElements = '';

  const effectiveBg = bgColor === 'transparent' ? 'none' : bgColor;

  if (frameStyle === 'polaroid') {
    frameBackground = `<rect width="${canvasWidth}" height="${canvasHeight}" rx="8" fill="${bgColor === 'transparent' ? '#ffffff' : bgColor}" stroke="${fgColor}" stroke-opacity="0.14" stroke-width="1.5"/>`;
    frameElements = `
      <text x="${canvasWidth / 2}" y="${canvasHeight - 34}" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="14" font-weight="700" letter-spacing="0.14em" fill="${fgColor}">
        ${escapeXML(frameText.toUpperCase())}
      </text>
      <text x="${canvasWidth / 2}" y="${canvasHeight - 16}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="500" letter-spacing="0.08em" fill="${fgColor}" opacity="0.45">
        Q2R // QUICK 2 REDIRECT
      </text>
    `;
  } else if (frameStyle === 'badge-bottom') {
    const badgeW = Math.min(canvasWidth - 40, Math.max(120, frameText.length * 11 + 32));
    const badgeX = (canvasWidth - badgeW) / 2;
    const badgeY = canvasHeight - 34;

    frameBackground = effectiveBg !== 'none' ? `<rect width="${canvasWidth}" height="${canvasHeight}" fill="${effectiveBg}"/>` : '';
    frameElements = `
      <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="26" rx="13" fill="${fgColor}" />
      <text x="${canvasWidth / 2}" y="${badgeY + 17}" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="600" letter-spacing="0.06em" fill="${bgColor === 'transparent' ? '#ffffff' : bgColor}">
        ${escapeXML(frameText.toUpperCase())}
      </text>
    `;
  } else if (frameStyle === 'minimal-border') {
    frameBackground = `
      <rect x="4" y="4" width="${canvasWidth - 8}" height="${canvasHeight - 8}" rx="6" fill="${effectiveBg}" stroke="${fgColor}" stroke-opacity="0.2" stroke-width="1.5"/>
    `;
    if (frameText.trim()) {
      frameElements = `
        <line x1="20" y1="${canvasHeight - 36}" x2="${canvasWidth - 20}" y2="${canvasHeight - 36}" stroke="${fgColor}" stroke-opacity="0.12" stroke-width="1" />
        <text x="${canvasWidth / 2}" y="${canvasHeight - 18}" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="600" letter-spacing="0.12em" fill="${fgColor}">
          ${escapeXML(frameText.toUpperCase())}
        </text>
      `;
    }
  } else {
    // None
    if (effectiveBg !== 'none') {
      frameBackground = `<rect width="${canvasWidth}" height="${canvasHeight}" fill="${effectiveBg}"/>`;
    }
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="100%" height="100%" style="display:block;max-width:100%;height:auto;">
  ${frameBackground}
  ${paths.join('\n')}
  ${frameElements}
</svg>
`.trim();
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Export as lossless SVG file
export function exportAsSVG(svgString: string, filename = 'quick-release-qrcode.svg'): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export as raster PNG or JPEG at selected resolution
export async function exportAsRaster(
  svgString: string,
  format: 'png' | 'jpeg',
  scale: 1 | 2 | 4 = 2,
  filename = 'quick-release-qrcode'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.documentElement;
    const width = parseFloat(svgEl.getAttribute('width') || '300') * scale;
    const height = parseFloat(svgEl.getAttribute('height') || '300') * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const dataUrl = canvas.toDataURL(mimeType, 0.95);

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filename}-${scale * 512}px.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      resolve();
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

// Copy SVG string or PNG to clipboard
export async function copyToClipboard(
  svgString: string,
  mode: 'svg' | 'png' = 'png'
): Promise<'svg' | 'png'> {
  if (mode === 'svg') {
    await navigator.clipboard.writeText(svgString);
    return 'svg';
  }

  // Render to canvas and copy blob to clipboard
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.documentElement;
    const width = parseFloat(svgEl.getAttribute('width') || '300') * 2;
    const height = parseFloat(svgEl.getAttribute('height') || '300') * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas unavailable'));

    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(async (pngBlob) => {
        if (!pngBlob) return reject(new Error('Failed to generate PNG blob'));
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': pngBlob }),
          ]);
          resolve('png');
        } catch {
          // Fallback to text if clipboard image write is unsupported
          await navigator.clipboard.writeText(svgString);
          resolve('svg');
        }
      }, 'image/png');
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

// Direct Print Preview
export function printQRCode(svgString: string, title = 'Q2R - Quick 2 Redirect QR Code'): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeXML(title)} - Print</title>
        <style>
          body {
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #ffffff;
            color: #000000;
          }
          .qr-container {
            max-width: 480px;
            width: 80%;
            text-align: center;
          }
          svg {
            width: 100%;
            height: auto;
          }
          .meta {
            margin-top: 24px;
            font-size: 11px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #666666;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          ${svgString}
          <div class="meta">Generated with Q2R · Quick 2 Redirect</div>
        </div>
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
