import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.goog',
  '169.254.169.254',
  '0.0.0.0',
  '::1',
  '::',
]);

export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;
  const normalized = ip.toLowerCase().replace(/^::ffff:/, '');

  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 127) return true; // Loopback 127.0.0.0/8
    if (a === 169 && b === 254) return true; // Link-local / Cloud metadata 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
    if (a === 192 && b === 0 && parts[2] === 2) return true; // TEST-NET-1
    if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
    if (a >= 224) return true; // Multicast & reserved
    return false;
  }

  if (net.isIPv6(normalized)) {
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA fc00::/7
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
      return true; // fe80::/10 link-local
    }
    if (normalized.startsWith('ff')) return true; // Multicast
    return false;
  }

  return true;
}

export async function validatePublicHttpUrl(rawInput: string): Promise<{ valid: true; url: URL } | { valid: false; error: string }> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a website URL.' };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: 'Invalid URL format. Example: https://stripe.com' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs containing embedded credentials are not permitted.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    return { valid: false, error: 'Local, internal, and cloud metadata endpoints are blocked for security.' };
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { valid: false, error: 'Private and reserved IP addresses are blocked (SSRF protection).' };
    }
    return { valid: true, url: parsed };
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { valid: false, error: `Could not resolve DNS for "${hostname}".` };
    }
    for (const record of records) {
      if (isPrivateOrReservedIp(record.address)) {
        return { valid: false, error: `Target host "${hostname}" resolves to a restricted private or metadata IP address.` };
      }
    }
  } catch {
    return { valid: false, error: `Unable to resolve domain "${hostname}". Please verify the website is publicly accessible.` };
  }

  return { valid: true, url: parsed };
}

export function sanitizeUntrustedText(input: string, maxLength = 4000): string {
  if (!input) return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/<\/?untrusted_website_data>/gi, '')
    .slice(0, maxLength)
    .trim();
}

export function wrapUntrustedWebsiteData(label: string, content: string): string {
  const safe = sanitizeUntrustedText(content, 18000);
  return `<untrusted_website_data source="${label}">\n${safe}\n</untrusted_website_data>`;
}

export function isSafeProjectFilePath(filePath: string): boolean {
  if (!filePath || filePath.startsWith('/') || filePath.includes('\\') || filePath.includes('\0')) {
    return false;
  }
  const normalized = path.posix.normalize(filePath);
  if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
    return false;
  }
  return normalized.length > 0 && normalized.length <= 200;
}
