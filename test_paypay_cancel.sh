#!/bin/bash

BASE_URL="http://localhost:3001/api/v1"

# Utility function to extract JSON field using python
json_val() {
    python3 -c "import sys, json; print(json.load(sys.stdin)$1)"
}

echo "=== Setup: Login & Get IDs ==="

# Login Yakisoba Leader
TOKEN_YAKI=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leader@yakisoba.example.com","password":"password123"}' | json_val "['data']['token']")

ORG_YAKI=$(curl -s -X GET $BASE_URL/users/me \
  -H "Authorization: Bearer $TOKEN_YAKI" | json_val "['data']['organizations'][0]['id']")

echo "Yakisoba Org ID: $ORG_YAKI"

# Get Product ID (Yakisoba)
PROD_ID=$(docker exec koubou-pos-db psql -U postgres -d koubou_pos -t -c "SELECT id FROM \"Product\" WHERE name = '焼きそば（並）' LIMIT 1;" | tr -d ' \n')
echo "Product ID: $PROD_ID"

echo "---------------------------------------------------"

echo "=== 1. Create Payable Transaction (PayPay) ==="
TX_ID=$(curl -s -X POST $BASE_URL/organizations/$ORG_YAKI/transactions \
  -H "Authorization: Bearer $TOKEN_YAKI" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"$PROD_ID\",\"quantity\":1}],\"paymentMethod\":\"PAYPAY\"}" | json_val "['data']['id']")
echo "Created TX: $TX_ID"

echo "---------------------------------------------------"

echo "=== 2. Create PayPay QR Code (saves codeId) ==="
# This step simulates opening the payment modal
QR_RESP=$(curl -s -X POST $BASE_URL/organizations/$ORG_YAKI/transactions/$TX_ID/paypay/create \
  -H "Authorization: Bearer $TOKEN_YAKI")

echo "QR Created."

# Optional: Inspect DB to see if paypayCodeId is set (requires direct DB access or just trust the next step logic)

echo "---------------------------------------------------"

echo "=== 3. Cancel Transaction (P3-011) ==="
CANCEL_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BASE_URL/organizations/$ORG_YAKI/transactions/$TX_ID/cancel \
  -H "Authorization: Bearer $TOKEN_YAKI")

echo "Cancel Response:"
echo "$CANCEL_RESP"

echo "$CANCEL_RESP" | grep "CANCELLED" > /dev/null && echo "✅ Transaction Cancelled Successfully" || echo "❌ Transaction Cancellation Failed"

echo "---------------------------------------------------"

echo "=== 4. Verify Status ==="
# Attempt to cancel again (should succeed/return idempotent response OR fail if strict, but based on code it returns transaction if P3-011 logic handles double cancel)
# Or just check completion (should fail)

COMPLETE_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BASE_URL/organizations/$ORG_YAKI/transactions/$TX_ID/paypay/create \
  -H "Authorization: Bearer $TOKEN_YAKI")

# Should fail because not PENDING (it is CANCELLED)
echo "$COMPLETE_RESP" | grep "TXN_NOT_PENDING" > /dev/null && echo "✅ Re-creation blocked (Correctly CANCELLED)" || echo "❌ Re-creation not blocked"
