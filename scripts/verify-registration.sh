#!/usr/bin/env bash
set -euo pipefail
: "${REGISTRATION_ID:?Set REGISTRATION_ID}"
: "${TELEGRAPH_NODE_URL:=https://devnode.telegraphprotocol.com}"
curl --fail --silent --show-error "$TELEGRAPH_NODE_URL/api/miners/$REGISTRATION_ID" | jq .
