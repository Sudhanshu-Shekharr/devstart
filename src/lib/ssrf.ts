import dns from 'dns';
import { promisify } from 'util';

const lookupAsync = promisify(dns.lookup);

export async function isSafeUrl(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }

    // Resolve the hostname
    const { address } = await lookupAsync(url.hostname);

    // Check against private IP ranges
    return !isPrivateIP(address);
  } catch {
    // If URL parsing or DNS resolution fails, treat it as unsafe
    return false;
  }
}

function isPrivateIP(ip: string): boolean {
  // IPv4 mapping for IPv6 (e.g., ::ffff:127.0.0.1)
  if (ip.includes('::ffff:')) {
    ip = ip.split('::ffff:')[1];
  }

  const parts = ip.split('.');
  if (parts.length !== 4) {
    // IPv6 checks (simplistic version for common local blocks)
    // ::1 is localhost in IPv6, fc00::/7 is unique local, fe80::/10 is link local
    return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb');
  }

  const [a, b] = parts.map(Number);

  // 127.0.0.0 - 127.255.255.255 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0 - 10.255.255.255 (Private)
  if (a === 10) return true;

  // 172.16.0.0 - 172.31.255.255 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0 - 192.168.255.255 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0 - 169.254.255.255 (Link-local)
  if (a === 169 && b === 254) return true;

  // 0.0.0.0 - 0.255.255.255 (Current network)
  if (a === 0) return true;

  return false;
}
