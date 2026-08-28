import { keccak256 } from 'js-sha3';
import { CHAINS, rpcCall, type ChainInfo } from './rpc.js';

// The router's own description of WALLET_BALANCE_CHECK says a query may name
// "a specific blockchain address or ENS name", so a miner that only accepts
// 0x-prefixed addresses fails a whole class of legitimate questions.
//
// ENS records live on Ethereum mainnet regardless of which chain the balance
// is later read from, so resolution always targets mainnet.
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const RESOLVER_SELECTOR = '0x0178b8bf'; // resolver(bytes32)
const ADDR_SELECTOR = '0x3b3b57de'; // addr(bytes32)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function isEnsName(value: string): boolean {
  const name = value.trim().toLowerCase();
  return (
    /^(?:[a-z0-9-_]+\.)+(?:eth|xyz|com|org|io|art|luxe|kred)$/.test(name) && name.includes('.')
  );
}

/**
 * EIP-137 namehash: recursively hash labels from the right, so
 * `namehash(a.b)` = keccak(namehash(b) || keccak("a")).
 */
export function namehash(name: string): string {
  let node = new Uint8Array(32); // 32 zero bytes for the empty root
  const labels = name.trim().toLowerCase().replace(/\.$/, '').split('.');
  for (const label of labels.reverse()) {
    if (label.length === 0) continue;
    const labelHash = keccak256.array(label);
    const combined = new Uint8Array(64);
    combined.set(node, 0);
    combined.set(labelHash, 32);
    node = new Uint8Array(keccak256.array(combined));
  }
  return `0x${Buffer.from(node).toString('hex')}`;
}

function addressFromWord(word: string): string | null {
  if (typeof word !== 'string' || word.length < 66) return null;
  const address = `0x${word.slice(-40)}`;
  return address.toLowerCase() === ZERO_ADDRESS ? null : address;
}

/** Resolves an ENS name to an address, or null when it does not resolve. */
export async function resolveEnsName(name: string): Promise<string | null> {
  const mainnet = CHAINS.ethereum as ChainInfo;
  const node = namehash(name);
  try {
    const resolverWord = await rpcCall<string>(mainnet, 'eth_call', [
      { to: ENS_REGISTRY, data: `${RESOLVER_SELECTOR}${node.slice(2)}` },
      'latest',
    ]);
    const resolver = addressFromWord(resolverWord);
    if (!resolver) return null;

    const addrWord = await rpcCall<string>(mainnet, 'eth_call', [
      { to: resolver, data: `${ADDR_SELECTOR}${node.slice(2)}` },
      'latest',
    ]);
    return addressFromWord(addrWord);
  } catch {
    return null;
  }
}
