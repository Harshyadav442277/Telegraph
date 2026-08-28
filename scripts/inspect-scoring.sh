#!/usr/bin/env bash
set -euo pipefail
: "${TELEGRAPH_NODE_URL:=https://devnode.telegraphprotocol.com}"
curl --fail --silent --show-error "$TELEGRAPH_NODE_URL/api/miners" | jq '[.[] | select(.supported_intents | index("SSL_VERIFICATION")) | {id,slug,activation_status,total_requests_served,scored,scores}]'
