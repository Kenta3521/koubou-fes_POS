#!/bin/bash

BASE_URL="http://localhost:3001/api/v1"

# Utility function to extract JSON field using python
json_val() {
    python3 -c "import sys, json; print(json.load(sys.stdin)$1)"
}

echo "=== 1. Setup: Login & Get IDs ==="

# Login Yakisoba Leader
TOKEN_YAKI=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leader@yakisoba.example.com","password":"password123"}' | json_val "['data']['token']")

ORG_YAKI=$(curl -s -X GET $BASE_URL/users/me \
  -H "Authorization: Bearer $TOKEN_YAKI" | json_val "['data']['organizations'][0]['id']")

echo "Yakisoba Org ID: $ORG_YAKI"

# Login Takoyaki Leader
TOKEN_TAKO=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leader@takoyaki.example.com","password":"password123"}' | json_val "['data']['token']")

ORG_TAKO=$(curl -s -X GET $BASE_URL/users/me \
  -H "Authorization: Bearer $TOKEN_TAKO" | json_val "['data']['organizations'][0]['id']")

echo "Takoyaki Org ID: $ORG_TAKO"

# Get Product ID (Yakisoba)
PROD_ID=$(docker exec koubou-pos-db psql -U postgres -d koubou_pos -t -c "SELECT id FROM \"Product\" WHERE name = '焼きそば（並）' LIMIT 1;" | tr -d ' \n')
echo "Product ID: $PROD_ID"

echo "---------------------------------------------------"

echo "=== 2. Test Success Flow ==="
# Create Transaction (Yakisoba)
TX_ID_1=$(curl -s -X POST $BASE_URL/organizations/$ORG_YAKI/transactions \
  -H "Authorization: Bearer $TOKEN_YAKI" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"$PROD_ID\",\"quantity\":1}],\"paymentMethod\":\"CASH\"}" | json_val "['data']['id']")
echo "Created TX 1: $TX_ID_1"

# Complete Transaction
echo "Completing TX 1..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BASE_URL/organizations/$ORG_YAKI/transactions/$TX_ID_1/complete-cash \
  -H "Authorization: Bearer $TOKEN_YAKI")
echo "$RESPONSE" | grep "success\":true" > /dev/null && echo "✅ Success Flow Passed" || echo "❌ Success Flow Failed"

echo "---------------------------------------------------"

echo "=== 3. Test Error: Transaction Already Completed ==="
# Try to complete TX 1 again
echo "Completing TX 1 again (should fail)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BASE_URL/organizations/$ORG_YAKI/transactions/$TX_ID_1/complete-cash \
  -H "Authorization: Bearer $TOKEN_YAKI")
echo "$RESPONSE" | grep "TRANSACTION_NOT_PENDING" > /dev/null && echo "✅ Double Completion Check Passed" || echo "❌ Double Completion Check Failed"

echo "---------------------------------------------------"

echo "=== 4. Test Error: User Not Member ==="
# Create Transaction (Yakisoba)
TX_ID_2=$(curl -s -X POST $BASE_URL/organizations/$ORG_YAKI/transactions \
  -H "Authorization: Bearer $TOKEN_YAKI" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"$PROD_ID\",\"quantity\":1}],\"paymentMethod\":\"CASH\"}" | json_val "['data']['id']")
echo "Created TX 2: $TX_ID_2"

# Try to complete with Takoyaki Leader Token
echo "Completing TX 2 with Takoyaki User (should fail)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BASE_URL/organizations/$ORG_YAKI/transactions/$TX_ID_2/complete-cash \
  -H "Authorization: Bearer $TOKEN_TAKO")
echo "$RESPONSE" | grep "USER_NOT_MEMBER" > /dev/null && echo "✅ Non-Member Access Check Passed" || echo "❌ Non-Member Access Check Failed"

echo "---------------------------------------------------"

echo "=== 5. Test Error: Organization Mismatch ==="
# Try to complete TX 2 but using Takoyaki Org ID in URL
echo "Completing TX 2 with mismatched Org ID in URL (should fail)..."
# Using Yaki Token (so member check would pass for Yaki Org, but we send Tako Org ID)
# Logic: 
# 1. Fetch Tx (belongs to Yaki)
# 2. Check if Tx.org (Yaki) == Param.org (Tako) -> Fail
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BASE_URL/organizations/$ORG_TAKO/transactions/$TX_ID_2/complete-cash \
  -H "Authorization: Bearer $TOKEN_YAKI")
echo "$RESPONSE" | grep "ORGANIZATION_MISMATCH" > /dev/null && echo "✅ Organization Mismatch Check Passed" || echo "❌ Organization Mismatch Check Failed"

echo "---------------------------------------------------"
