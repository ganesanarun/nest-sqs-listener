#!/bin/bash

# Script to send test messages to SQS queues
# Usage: ./send-test-messages.sh [localstack|aws]

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
NOTIFICATION_QUEUE="notification-events"

echo "=========================================="
echo "Sending test messages to SQS queues"
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
  local queue_name=$3
  
  local cmd="aws sqs send-message --queue-url $queue_url --message-body '$message_body' --region $REGION --output json"
  
  if [ -n "$ENDPOINT_URL" ]; then
    cmd="$cmd --endpoint-url $ENDPOINT_URL"
  fi
  
  if eval "$cmd" > /dev/null 2>&1; then
    echo "✓ Message sent to '$queue_name'"
    return 0
  else
    echo "✗ Failed to send message to '$queue_name'"
    return 1
  fi
}

# Get queue URLs
echo "Getting queue URLs..."
ORDER_QUEUE_URL=$(get_queue_url "$ORDER_QUEUE")
NOTIFICATION_QUEUE_URL=$(get_queue_url "$NOTIFICATION_QUEUE")
echo ""

# Order event message payloads
ORDER_MESSAGE_1='{
  "orderId": "ORD-001",
  "customerId": "CUST-123",
  "amount": 99.99,
  "items": [
    {
      "productId": "PROD-456",
      "quantity": 2
    },
    {
      "productId": "PROD-789",
      "quantity": 1
    }
  ]
}'

ORDER_MESSAGE_2='{
  "orderId": "ORD-002",
  "customerId": "CUST-456",
  "amount": 149.50,
  "items": [
    {
      "productId": "PROD-111",
      "quantity": 1
    }
  ]
}'

# Notification event message payloads
NOTIFICATION_MESSAGE_1='{
  "userId": "USER-123",
  "type": "email",
  "message": "Your order has been confirmed",
  "priority": "high"
}'

NOTIFICATION_MESSAGE_2='{
  "userId": "USER-456",
  "type": "sms",
  "message": "Your package is out for delivery",
  "priority": "medium"
}'

NOTIFICATION_MESSAGE_3='{
  "userId": "USER-789",
  "type": "push",
  "message": "New promotion available",
  "priority": "low"
}'

# Send order messages
echo "Sending order event messages..."
send_message "$ORDER_QUEUE_URL" "$ORDER_MESSAGE_1" "$ORDER_QUEUE"
send_message "$ORDER_QUEUE_URL" "$ORDER_MESSAGE_2" "$ORDER_QUEUE"
echo ""

# Send notification messages
echo "Sending notification event messages..."
send_message "$NOTIFICATION_QUEUE_URL" "$NOTIFICATION_MESSAGE_1" "$NOTIFICATION_QUEUE"
send_message "$NOTIFICATION_QUEUE_URL" "$NOTIFICATION_MESSAGE_2" "$NOTIFICATION_QUEUE"
send_message "$NOTIFICATION_QUEUE_URL" "$NOTIFICATION_MESSAGE_3" "$NOTIFICATION_QUEUE"
echo ""

echo "=========================================="
echo "Test messages sent successfully!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - 2 messages sent to '$ORDER_QUEUE'"
echo "  - 3 messages sent to '$NOTIFICATION_QUEUE'"
echo ""
echo "Check your application logs to see the messages being processed."
