#!/bin/bash

# Script to send invalid test messages for validation testing
# Usage: ./send-invalid-messages.sh [localstack|aws]

set -e

# Parse environment argument
ENVIRONMENT="${1:-localstack}"

# Configuration based on environment
if [ "$ENVIRONMENT" = "localstack" ]; then
  ENDPOINT_URL="${AWS_ENDPOINT:-http://localhost:4566}"
  REGION="${AWS_REGION:-us-east-1}"
  echo "Using LocalStack environment"
elif [ "$ENVIRONMENT" = "aws" ]; then
  ENDPOINT_URL=""
  REGION="${AWS_REGION:-us-east-1}"
  echo "Using AWS environment"
else
  echo "Error: Invalid environment. Use 'localstack' or 'aws'"
  echo "Usage: $0 [localstack|aws]"
  exit 1
fi

# Queue names
ORDER_QUEUE="order-events"

echo "=========================================="
echo "Sending INVALID test messages for validation testing"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
if [ -n "$ENDPOINT_URL" ]; then
  echo "Endpoint: $ENDPOINT_URL"
fi
echo ""

# Function to get queue URL
get_queue_url() {
  local queue_name=$1
  local cmd="aws sqs get-queue-url --queue-name $queue_name --region $REGION --output text"
  
  if [ -n "$ENDPOINT_URL" ]; then
    cmd="$cmd --endpoint-url $ENDPOINT_URL"
  fi
  
  eval "$cmd" 2>/dev/null || {
    echo "Error: Queue '$queue_name' not found"
    return 1
  }
}

# Function to send message
send_message() {
  local queue_url=$1
  local message_body=$2
  local description=$3
  
  local cmd="aws sqs send-message --queue-url $queue_url --message-body '$message_body' --region $REGION --output json"
  
  if [ -n "$ENDPOINT_URL" ]; then
    cmd="$cmd --endpoint-url $ENDPOINT_URL"
  fi
  
  if eval "$cmd" > /dev/null 2>&1; then
    echo "✓ Sent: $description"
    return 0
  else
    echo "✗ Failed: $description"
    return 1
  fi
}

# Get queue URL
echo "Getting queue URL..."
ORDER_QUEUE_URL=$(get_queue_url "$ORDER_QUEUE")
echo ""

echo "Sending invalid messages..."
echo ""

# 1. Negative amount
send_message "$ORDER_QUEUE_URL" '{
  "orderId": "ORD-INVALID-1",
  "customerId": "CUST-123",
  "amount": -50,
  "items": [{"productId": "PROD-456", "quantity": 2}]
}' "Negative amount"

# 2. Missing required field (customerId)
send_message "$ORDER_QUEUE_URL" '{
  "orderId": "ORD-INVALID-2",
  "amount": 99.99,
  "items": [{"productId": "PROD-456", "quantity": 2}]
}' "Missing customerId"

# 3. Invalid nested item (quantity = 0, should be >= 1)
send_message "$ORDER_QUEUE_URL" '{
  "orderId": "ORD-INVALID-3",
  "customerId": "CUST-123",
  "amount": 99.99,
  "items": [{"productId": "PROD-456", "quantity": 0}]
}' "Invalid item quantity (0)"

# 4. Invalid nested item (negative quantity)
send_message "$ORDER_QUEUE_URL" '{
  "orderId": "ORD-INVALID-4",
  "customerId": "CUST-123",
  "amount": 99.99,
  "items": [{"productId": "PROD-456", "quantity": -5}]
}' "Invalid item quantity (negative)"

# 5. Multiple validation errors
send_message "$ORDER_QUEUE_URL" '{
  "orderId": "ORD-INVALID-5",
  "amount": -99.99,
  "items": [{"productId": "PROD-456", "quantity": 0}]
}' "Multiple errors (missing customerId, negative amount, invalid quantity)"

# 6. Items not an array
send_message "$ORDER_QUEUE_URL" '{
  "orderId": "ORD-INVALID-6",
  "customerId": "CUST-123",
  "amount": 99.99,
  "items": "not-an-array"
}' "Items not an array"

# 7. Missing items field
send_message "$ORDER_QUEUE_URL" '{
  "orderId": "ORD-INVALID-7",
  "customerId": "CUST-123",
  "amount": 99.99
}' "Missing items field"

echo ""
echo "=========================================="
echo "Invalid test messages sent!"
echo "=========================================="
echo ""
echo "Check your application logs to see detailed validation errors."
echo "You should see clear error messages showing which fields failed and why."
