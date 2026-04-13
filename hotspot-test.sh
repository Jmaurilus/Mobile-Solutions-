#!/bin/bash
#
# A/B Test: Normal Hotspot vs Proxy Hotspot
#
# Run this on the DEVICE CONNECTED TO THE HOTSPOT (laptop, etc.)
#
# Usage:
#   chmod +x hotspot-test.sh
#   ./hotspot-test.sh normal    # Test A: regular hotspot
#   ./hotspot-test.sh proxy     # Test B: with proxy enabled
#
# What it measures:
#   1. Public IP address (does carrier route differently?)
#   2. TTL value (main way carriers detect tethering)
#   3. Download speed (is traffic throttled?)
#   4. HTTP headers the server sees from you
#   5. DNS resolution time
#   6. Latency
#

MODE=${1:-"unknown"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_FILE="hotspot_test_${MODE}_${TIMESTAMP}.txt"
PROXY_ADDR="${2:-192.168.43.1}"
PROXY_PORT="${3:-8080}"

echo "========================================"
echo "  HOTSPOT A/B TEST — Mode: $MODE"
echo "========================================"
echo ""
echo "Results will be saved to: $RESULT_FILE"
echo ""

# Use proxy for curl if in proxy mode
if [ "$MODE" = "proxy" ]; then
    CURL_PROXY="-x http://${PROXY_ADDR}:${PROXY_PORT}"
    echo "Using proxy: ${PROXY_ADDR}:${PROXY_PORT}"
else
    CURL_PROXY=""
    echo "Direct connection (no proxy)"
fi

{
echo "========================================"
echo "  HOTSPOT TEST RESULTS"
echo "  Mode: $MODE"
echo "  Date: $(date)"
echo "========================================"
echo ""

# ---- Test 1: Public IP ----
echo "--- TEST 1: Public IP Address ---"
echo "(If different between A/B, carrier is routing hotspot traffic separately)"
echo ""
IP_RESULT=$(curl $CURL_PROXY -s --max-time 10 https://api.ipify.org 2>&1)
echo "Public IP: $IP_RESULT"
echo ""

# Also get detailed IP info
IP_INFO=$(curl $CURL_PROXY -s --max-time 10 https://ipinfo.io/json 2>&1)
echo "IP Details:"
echo "$IP_INFO"
echo ""

# ---- Test 2: TTL Detection ----
echo "--- TEST 2: TTL Value ---"
echo "(Normal phone=64, tethered=63. If proxy works, should show 64)"
echo ""
TTL_RESULT=$(curl $CURL_PROXY -s --max-time 10 https://www.cloudflare.com/cdn-cgi/trace 2>&1)
echo "$TTL_RESULT"
echo ""

# ---- Test 3: HTTP Headers Seen by Server ----
echo "--- TEST 3: HTTP Headers (what the server sees) ---"
echo "(Check User-Agent, X-Forwarded-For, Via headers)"
echo ""
HEADERS=$(curl $CURL_PROXY -s --max-time 10 https://httpbin.org/headers 2>&1)
echo "$HEADERS"
echo ""

# ---- Test 4: Download Speed ----
echo "--- TEST 4: Download Speed ---"
echo "(Compare between A/B to detect throttling)"
echo ""

# Small file test (1MB)
echo "Downloading 1MB test file..."
SPEED_1MB=$(curl $CURL_PROXY -s -o /dev/null -w "%{speed_download}" --max-time 30 \
    https://speed.cloudflare.com/__down?bytes=1048576 2>&1)
SPEED_1MB_MBPS=$(echo "scale=2; $SPEED_1MB / 1048576 * 8" | bc 2>/dev/null || echo "$SPEED_1MB bytes/sec")
echo "1MB file: ${SPEED_1MB_MBPS} Mbps (raw: ${SPEED_1MB} bytes/sec)"
echo ""

# Medium file test (5MB)
echo "Downloading 5MB test file..."
SPEED_5MB=$(curl $CURL_PROXY -s -o /dev/null -w "%{speed_download}" --max-time 60 \
    https://speed.cloudflare.com/__down?bytes=5242880 2>&1)
SPEED_5MB_MBPS=$(echo "scale=2; $SPEED_5MB / 1048576 * 8" | bc 2>/dev/null || echo "$SPEED_5MB bytes/sec")
echo "5MB file: ${SPEED_5MB_MBPS} Mbps (raw: ${SPEED_5MB} bytes/sec)"
echo ""

# ---- Test 5: Latency ----
echo "--- TEST 5: Latency ---"
echo ""
for i in 1 2 3 4 5; do
    LATENCY=$(curl $CURL_PROXY -s -o /dev/null -w "%{time_total}" --max-time 10 \
        https://www.google.com 2>&1)
    echo "  Ping $i: ${LATENCY}s"
done
echo ""

# ---- Test 6: DNS Resolution ----
echo "--- TEST 6: DNS Resolution Time ---"
echo ""
DNS_TIME=$(curl $CURL_PROXY -s -o /dev/null -w "dns: %{time_namelookup}s\nconnect: %{time_connect}s\nttfb: %{time_starttransfer}s\ntotal: %{time_total}s" \
    --max-time 10 https://www.google.com 2>&1)
echo "$DNS_TIME"
echo ""

# ---- Test 7: Connection Fingerprint ----
echo "--- TEST 7: TLS Fingerprint ---"
echo "(Carriers may inspect TLS client hello)"
echo ""
TLS_INFO=$(curl $CURL_PROXY -s --max-time 10 https://tls.browserleaks.com/json 2>&1)
echo "$TLS_INFO"
echo ""

echo "========================================"
echo "  TEST COMPLETE"
echo "========================================"

} | tee "$RESULT_FILE"

echo ""
echo "Results saved to: $RESULT_FILE"
echo ""
echo "Next steps:"
if [ "$MODE" = "normal" ]; then
    echo "  1. Enable the proxy in the app"
    echo "  2. Set your WiFi proxy to ${PROXY_ADDR}:${PROXY_PORT}"
    echo "  3. Run: ./hotspot-test.sh proxy"
    echo "  4. Compare the two result files"
elif [ "$MODE" = "proxy" ]; then
    echo "  Compare results:"
    echo "    diff hotspot_test_normal_*.txt hotspot_test_proxy_*.txt"
    echo ""
    echo "  Key things to look for:"
    echo "    - Same public IP? (carrier routing)"
    echo "    - TTL=64 in proxy mode? (tethering detection bypass)"
    echo "    - Speed difference? (throttling)"
    echo "    - Different headers? (carrier injection)"
fi
