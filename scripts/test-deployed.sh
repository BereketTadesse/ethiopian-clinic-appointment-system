#!/bin/bash

# ==============================================================================
# CareSync Ethiopia - Deployed Service Automated Smoke Test Script
# Usage: ./scripts/test-deployed.sh https://<your-service-name>.onrender.com
# ==============================================================================

TARGET_URL="${1:-}"

# Terminal Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================================================="
echo " 🩺 CareSync Ethiopia - Live Cloud Deployment Health & API Test"
echo "=========================================================================="

if [ -z "$TARGET_URL" ]; then
  echo -e "${YELLOW}Please provide your Render service URL as the first argument.${NC}"
  echo "Example:"
  echo "  ./scripts/test-deployed.sh https://clinic-user-service.onrender.com"
  echo ""
  read -p "Enter your Render Service URL: " TARGET_URL
fi

# Strip trailing slash if present
TARGET_URL="${TARGET_URL%/}"

echo ""
echo -e "Testing live backend at: ${BLUE}${TARGET_URL}${NC}"
echo "--------------------------------------------------------------------------"

# 1. Health Check Endpoint Probe
echo -n "🔍 1. Testing Health Check Probe (GET /health)... "
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$TARGET_URL/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_STATUS" -eq 200 ]; then
  echo -e "${GREEN}PASSED (HTTP 200)${NC}"
  echo "   Response: $HEALTH_BODY"
else
  echo -e "${RED}FAILED (HTTP $HEALTH_STATUS)${NC}"
  echo "   Response: $HEALTH_BODY"
  echo -e "   ${YELLOW}Hint: Ensure service is marked 'Live' in Render dashboard.${NC}"
fi

echo ""

# 2. Swagger API Documentation Probe
echo -n "📖 2. Testing Swagger UI Docs (GET /api-docs/)... "
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api-docs/")

if [ "$DOCS_STATUS" -eq 200 ] || [ "$DOCS_STATUS" -eq 301 ] || [ "$DOCS_STATUS" -eq 302 ]; then
  echo -e "${GREEN}PASSED (HTTP $DOCS_STATUS)${NC}"
  echo "   Interactive UI is accessible at: $TARGET_URL/api-docs"
else
  echo -e "${RED}FAILED (HTTP $DOCS_STATUS)${NC}"
fi

echo ""

# 3. Authentication Test: POST /api/users/login
echo "🔐 3. Testing Authentication & JWT Generation (POST /api/users/login)..."
echo "   Attempting login with: admin@clinic.et"

LOGIN_RESPONSE=$(curl -s -X POST "$TARGET_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.et","password":"Admin@123456"}')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$ACCESS_TOKEN" ]; then
  echo -e "   ${GREEN}PASSED: Login successful! JWT Access Token received.${NC}"
  echo "   Token Prefix: ${ACCESS_TOKEN:0:28}..."
else
  # Check if another seeded account works
  echo -e "   ${YELLOW}Default admin login returned: $LOGIN_RESPONSE${NC}"
  echo "   Attempting login with doctor account: doctor.abebe@clinic.et..."
  LOGIN_RESPONSE=$(curl -s -X POST "$TARGET_URL/api/users/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"doctor.abebe@clinic.et","password":"Doctor@123456"}')
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

  if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "   ${GREEN}PASSED: Doctor login successful! JWT Token received.${NC}"
  else
    echo -e "   ${RED}FAILED: Could not retrieve Access Token.${NC}"
    echo "   Response: $LOGIN_RESPONSE"
  fi
fi

echo ""

# 4. Protected Route Test: Authenticated Endpoint
if [ -n "$ACCESS_TOKEN" ]; then
  echo -n "🛡️ 4. Testing Protected API Route (GET /api/users/getUsers with Bearer Auth)... "
  PROTECTED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api/users/getUsers" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  if [ "$PROTECTED_STATUS" -eq 200 ]; then
    echo -e "${GREEN}PASSED (HTTP 200 - Authorized)${NC}"
  elif [ "$PROTECTED_STATUS" -eq 403 ]; then
    echo -e "${YELLOW}PASSED (HTTP 403 - Token verified, RBAC working)${NC}"
  else
    echo -e "${RED}FAILED (HTTP $PROTECTED_STATUS)${NC}"
  fi
fi

echo ""
echo "=========================================================================="
echo " 🏁 Test Summary"
echo "=========================================================================="
echo " • Live Base URL: $TARGET_URL"
echo " • Swagger Docs:  $TARGET_URL/api-docs"
echo " • Health Check:  $TARGET_URL/health"
echo "=========================================================================="
echo ""
