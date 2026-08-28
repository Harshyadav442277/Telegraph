import { isIP } from 'node:net';

function ipv4ToNumber(value: string): number {
  return value.split('.').reduce((acc, part) => acc * 256 + Number(part), 0) >>> 0;
}

function isUnsafeIpv4(address: string): boolean {
  const value = ipv4ToNumber(address);
  const ranges: Array<[number, number]> = [
    [ipv4ToNumber('0.0.0.0'), ipv4ToNumber('0.255.255.255')],
    [ipv4ToNumber('10.0.0.0'), ipv4ToNumber('10.255.255.255')],
    [ipv4ToNumber('100.64.0.0'), ipv4ToNumber('100.127.255.255')],
    [ipv4ToNumber('127.0.0.0'), ipv4ToNumber('127.255.255.255')],
    [ipv4ToNumber('169.254.0.0'), ipv4ToNumber('169.254.255.255')],
    [ipv4ToNumber('172.16.0.0'), ipv4ToNumber('172.31.255.255')],
    [ipv4ToNumber('192.0.0.0'), ipv4ToNumber('192.0.0.255')],
    [ipv4ToNumber('192.168.0.0'), ipv4ToNumber('192.168.255.255')],
    [ipv4ToNumber('198.18.0.0'), ipv4ToNumber('198.19.255.255')],
    [ipv4ToNumber('224.0.0.0'), ipv4ToNumber('255.255.255.255')],
  ];
  return ranges.some(([start, end]) => value >= start && value <= end);
}

function expandIpv6(address: string): number[] {
  const normalized = address.toLowerCase().split('%')[0] ?? address.toLowerCase();
  const [leftRaw, rightRaw] = normalized.split('::');
  const left = leftRaw ? leftRaw.split(':').filter(Boolean) : [];
  const right = rightRaw ? rightRaw.split(':').filter(Boolean) : [];
  const words: string[] = [
    ...left,
    ...new Array<string>(8 - left.length - right.length).fill('0'),
    ...right,
  ];
  if (words.length !== 8) return [];
  return words.map((word) => Number.parseInt(word, 16));
}

function isUnsafeIpv6(address: string): boolean {
  const words = expandIpv6(address);
  if (words.length !== 8 || words.some((word) => Number.isNaN(word))) return true;
  const first = words[0] ?? 0;
  const second = words[1] ?? 0;
  const isUnspecified = words.every((word) => word === 0);
  const isLoopback =
    isUnspecified === false &&
    words.slice(0, 7).every((word) => word === 0) &&
    (words[7] ?? 0) === 1;
  const isUniqueLocal = (first & 0xfe00) === 0xfc00;
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const isMulticast = (first & 0xff00) === 0xff00;
  const isDocumentation = first === 0x2001 && second === 0x0db8;
  const isMapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  if (isMapped) {
    const mapped = `${(words[6] ?? 0) >> 8}.${(words[6] ?? 0) & 255}.${(words[7] ?? 0) >> 8}.${(words[7] ?? 0) & 255}`;
    return isUnsafeIpv4(mapped);
  }
  return (
    isUnspecified || isLoopback || isUniqueLocal || isLinkLocal || isMulticast || isDocumentation
  );
}

export function isUnsafeAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isUnsafeIpv4(address);
  if (family === 6) return isUnsafeIpv6(address);
  return true;
}

export function assertSafeAddress(address: string, allowPrivateTargets: boolean): void {
  if (!allowPrivateTargets && isUnsafeAddress(address)) {
    throw new Error(`unsafe destination address blocked: ${address}`);
  }
}

export function isSafeAddress(address: string, allowPrivateTargets = false): boolean {
  return allowPrivateTargets || !isUnsafeAddress(address);
}
