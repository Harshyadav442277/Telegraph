#!/usr/bin/env bash
set -euo pipefail

: "${DIAMOND:=0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8}"
RPC="${RPC:-<set RPC>}"
YAML_URL="${YAML_URL:-<set YAML_URL>}"
FEE_ADDRESS="${FEE_ADDRESS:-<set FEE_ADDRESS>}"
YAML_FILE="${YAML_FILE:-telegraph/miner.yaml}"
MIN_PRICE="${MIN_PRICE:-10000}"
YAML_HASH="0x$(sha256sum "$YAML_FILE" | awk '{print $1}')"

printf '%s\n' "About to register PREFLIGHT on Base Sepolia (chain 84532). This submits an on-chain transaction and spends gas."
printf '%s\n' "YAML hash: $YAML_HASH"
printf '%s\n' "cast send \"$DIAMOND\" \"registerMiner(string,bytes32,address,uint256,string[])\" \"$YAML_URL\" \"$YAML_HASH\" \"$FEE_ADDRESS\" \"$MIN_PRICE\" '[\"SSL_VERIFICATION\"]' --rpc-url \"$RPC\" --private-key <redacted>"
if [[ "${EXECUTE_ONCHAIN:-NO}" != YES ]]; then
  printf '%s\n' 'Dry run only. Set EXECUTE_ONCHAIN=YES to authorize submission.'
  exit 0
fi
: "${MINER_PRIVATE_KEY:?Set MINER_PRIVATE_KEY only in your shell/secret manager when EXECUTE_ONCHAIN=YES}"
[[ "$RPC" != '<set RPC>' ]] || { echo 'RPC is required for on-chain execution' >&2; exit 1; }
[[ "$YAML_URL" != '<set YAML_URL>' ]] || { echo 'YAML_URL is required for on-chain execution' >&2; exit 1; }
[[ "$FEE_ADDRESS" != '<set FEE_ADDRESS>' ]] || { echo 'FEE_ADDRESS is required for on-chain execution' >&2; exit 1; }
cast send "$DIAMOND" "registerMiner(string,bytes32,address,uint256,string[])" "$YAML_URL" "$YAML_HASH" "$FEE_ADDRESS" "$MIN_PRICE" '["SSL_VERIFICATION"]' --rpc-url "$RPC" --private-key "$MINER_PRIVATE_KEY"
