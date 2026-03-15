#!/usr/bin/env bash
#
# End-to-end test for mindOS
# Spins up Docker services, runs migrations, tests API endpoints, tears down.
#
# Usage: ./scripts/test-e2e.sh
#
# Requirements: docker, docker compose, curl, jq
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPOSE_FILE="docker/docker-compose.yml"
API_URL="http://localhost:3000"
PASSED=0
FAILED=0

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
fail()  { echo -e "${RED}[✗]${NC} $1"; FAILED=$((FAILED + 1)); }
pass()  { PASSED=$((PASSED + 1)); log "$1"; }

cleanup() {
	echo ""
	warn "Tearing down Docker services..."
	docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
}

trap cleanup EXIT

# ─── Preflight ─────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════"
echo "  mindOS End-to-End Test Suite"
echo "═══════════════════════════════════════════════════"
echo ""

for cmd in docker curl jq; do
	if ! command -v "$cmd" &>/dev/null; then
		fail "$cmd is required but not installed"
		exit 1
	fi
done

# ─── Build & Start ─────────────────────────────────────────────────────────

warn "Building and starting Docker services..."
docker compose -f "$COMPOSE_FILE" build --quiet 2>/dev/null
docker compose -f "$COMPOSE_FILE" up -d

warn "Waiting for API to be ready..."
RETRIES=30
until curl -sf "$API_URL/healthz" >/dev/null 2>&1; do
	RETRIES=$((RETRIES - 1))
	if [ "$RETRIES" -le 0 ]; then
		fail "API did not become ready in time"
		docker compose -f "$COMPOSE_FILE" logs api
		exit 1
	fi
	sleep 2
done
log "API is ready"

# ─── Test: Health Check ────────────────────────────────────────────────────

echo ""
echo "── Health ──────────────────────────────────────────"

HEALTH=$(curl -sf "$API_URL/healthz")
if echo "$HEALTH" | jq -e '.status == "ok"' >/dev/null 2>&1; then
	pass "GET /healthz returns ok"
else
	fail "GET /healthz did not return ok: $HEALTH"
fi

READY=$(curl -sf "$API_URL/readyz")
if echo "$READY" | jq -e '.status == "ready"' >/dev/null 2>&1; then
	pass "GET /readyz returns ready"
else
	fail "GET /readyz did not return ready: $READY"
fi

# ─── Test: Create API Key ─────────────────────────────────────────────────

echo ""
echo "── API Keys ────────────────────────────────────────"

KEY_RESPONSE=$(curl -sf -X POST "$API_URL/v1/api-keys" \
	-H "Content-Type: application/json" \
	-d '{"name": "e2e-test"}')

API_KEY=$(echo "$KEY_RESPONSE" | jq -r '.data.key // empty')
if [ -n "$API_KEY" ]; then
	pass "POST /v1/api-keys creates key: ${API_KEY:0:20}..."
else
	fail "POST /v1/api-keys did not return a key"
	echo "  Response: $KEY_RESPONSE"
	exit 1
fi

AUTH="Authorization: Bearer $API_KEY"

# ─── Test: Memory CRUD ─────────────────────────────────────────────────────

echo ""
echo "── Memory CRUD ─────────────────────────────────────"

# Create
CREATE_RESPONSE=$(curl -sf -X POST "$API_URL/v1/memories" \
	-H "$AUTH" -H "Content-Type: application/json" \
	-d '{"userId": "e2e_user", "content": "I prefer dark mode and use TypeScript daily.", "tags": ["preferences"]}')

MEMORY_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty')
if [ -n "$MEMORY_ID" ]; then
	pass "POST /v1/memories creates memory: $MEMORY_ID"
else
	fail "POST /v1/memories did not return memory ID"
	echo "  Response: $CREATE_RESPONSE"
fi

# Read
GET_RESPONSE=$(curl -sf "$API_URL/v1/memories/$MEMORY_ID" -H "$AUTH")
GOT_CONTENT=$(echo "$GET_RESPONSE" | jq -r '.data.content // empty')
if [ "$GOT_CONTENT" = "I prefer dark mode and use TypeScript daily." ]; then
	pass "GET /v1/memories/:id returns correct content"
else
	fail "GET /v1/memories/:id returned wrong content"
fi

# List
LIST_RESPONSE=$(curl -sf "$API_URL/v1/memories?userId=e2e_user" -H "$AUTH")
LIST_COUNT=$(echo "$LIST_RESPONSE" | jq '.data | length')
if [ "$LIST_COUNT" -ge 1 ]; then
	pass "GET /v1/memories?userId=... lists $LIST_COUNT memories"
else
	fail "GET /v1/memories returned empty list"
fi

# Update
UPDATE_RESPONSE=$(curl -sf -X PUT "$API_URL/v1/memories/$MEMORY_ID" \
	-H "$AUTH" -H "Content-Type: application/json" \
	-d '{"tags": ["preferences", "updated"]}')
UPDATED_TAGS=$(echo "$UPDATE_RESPONSE" | jq '.data.tags | length')
if [ "$UPDATED_TAGS" -eq 2 ]; then
	pass "PUT /v1/memories/:id updates tags"
else
	fail "PUT /v1/memories/:id did not update correctly"
fi

# Delete
DELETE_RESPONSE=$(curl -sf -X DELETE "$API_URL/v1/memories/$MEMORY_ID" -H "$AUTH")
DELETED=$(echo "$DELETE_RESPONSE" | jq -r '.data.deleted // empty')
if [ "$DELETED" = "true" ]; then
	pass "DELETE /v1/memories/:id soft-deletes"
else
	fail "DELETE /v1/memories/:id did not confirm deletion"
fi

# ─── Test: Duplicate Detection ─────────────────────────────────────────────

echo ""
echo "── Deduplication ───────────────────────────────────"

# Create first
curl -sf -X POST "$API_URL/v1/memories" \
	-H "$AUTH" -H "Content-Type: application/json" \
	-d '{"userId": "e2e_user", "content": "Unique content for dedup test"}' >/dev/null

# Try duplicate
DUP_STATUS=$(curl -so /dev/null -w "%{http_code}" -X POST "$API_URL/v1/memories" \
	-H "$AUTH" -H "Content-Type: application/json" \
	-d '{"userId": "e2e_user", "content": "Unique content for dedup test"}')

if [ "$DUP_STATUS" = "409" ]; then
	pass "Duplicate content returns 409 Conflict"
else
	fail "Duplicate content returned $DUP_STATUS instead of 409"
fi

# ─── Test: Search ──────────────────────────────────────────────────────────

echo ""
echo "── Search ────────────────────────────────────────────"

# Add a searchable memory
curl -sf -X POST "$API_URL/v1/memories" \
	-H "$AUTH" -H "Content-Type: application/json" \
	-d '{"userId": "e2e_user", "content": "I am working on a machine learning project with PyTorch"}' >/dev/null

sleep 1  # Brief pause for embedding to complete

SEARCH_RESPONSE=$(curl -sf -X POST "$API_URL/v1/memories/search" \
	-H "$AUTH" -H "Content-Type: application/json" \
	-d '{"query": "machine learning", "userId": "e2e_user"}')

SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | jq '.data.results | length')
if [ "$SEARCH_COUNT" -ge 1 ]; then
	pass "POST /v1/memories/search returns $SEARCH_COUNT results"
else
	warn "Search returned 0 results (may need embedding provider configured)"
fi

SEARCH_MODE=$(echo "$SEARCH_RESPONSE" | jq -r '.data.searchMode')
if [ "$SEARCH_MODE" = "hybrid" ]; then
	pass "Search uses hybrid mode by default"
else
	fail "Search mode is $SEARCH_MODE instead of hybrid"
fi

# ─── Test: Batch ───────────────────────────────────────────────────────────

echo ""
echo "── Batch ───────────────────────────────────────────"

BATCH_RESPONSE=$(curl -sf -X POST "$API_URL/v1/memories/batch" \
	-H "$AUTH" -H "Content-Type: application/json" \
	-d '{"memories": [
		{"userId": "e2e_user", "content": "Batch item 1"},
		{"userId": "e2e_user", "content": "Batch item 2"},
		{"userId": "e2e_user", "content": "Batch item 3"}
	]}')

BATCH_SUCCESS=$(echo "$BATCH_RESPONSE" | jq '.data.succeeded')
if [ "$BATCH_SUCCESS" -eq 3 ]; then
	pass "POST /v1/memories/batch creates $BATCH_SUCCESS memories"
else
	fail "Batch created $BATCH_SUCCESS instead of 3"
fi

# ─── Results ───────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "═══════════════════════════════════════════════════"

exit "$FAILED"
