export type FailureCode =
  | 'NONE'
  | 'DNS_FAILURE'
  | 'CONNECTION_FAILURE'
  | 'HANDSHAKE_FAILURE'
  | 'NO_CERTIFICATE'
  | 'UNTRUSTED_CHAIN'
  | 'HOSTNAME_MISMATCH'
  | 'EXPIRED'
  | 'NOT_YET_VALID'
  | 'INVALID_CERTIFICATE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface CertificateDetails {
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  fingerprint256?: string;
  validFrom?: string;
  validTo?: string;
  subjectAltNames?: string[];
  chainLength?: number;
  chainComplete?: boolean;
  keyBits?: number;
}

export interface NetworkDetails {
  resolvedAddresses: string[];
  selectedAddress?: string;
  family?: 4 | 6;
}

export interface TimingDetails {
  dns?: number;
  connect?: number;
  handshake?: number;
  total: number;
}

export interface TLSVerificationResult {
  input: string;
  normalizedHost: string;
  port: number;
  reachable: boolean;
  dnsResolved: boolean;
  handshakeSucceeded: boolean;
  certificatePresent: boolean;
  chainTrusted: boolean | null;
  hostnameValid: boolean | null;
  timeValid: boolean | null;
  valid: boolean;
  failureCode: FailureCode;
  failureMessage?: string;
  tlsProtocol?: string;
  cipher?: string;
  keyBits?: number;
  certificate?: CertificateDetails;
  network: NetworkDetails;
  timingMs: TimingDetails;
}

export interface TLSVerificationOptions {
  maxInputLength: number;
  dnsTimeoutMs: number;
  connectTimeoutMs: number;
  handshakeTimeoutMs: number;
  requestTimeoutMs: number;
  allowPrivateTargets: boolean;
  ca?: string | Buffer | Array<string | Buffer>;
  now?: () => Date;
}

export const DEFAULT_TLS_OPTIONS: TLSVerificationOptions = {
  maxInputLength: 2_048,
  dnsTimeoutMs: 5_000,
  connectTimeoutMs: 8_000,
  handshakeTimeoutMs: 10_000,
  requestTimeoutMs: 15_000,
  allowPrivateTargets: false,
};
