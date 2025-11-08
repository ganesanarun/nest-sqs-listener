#!/bin/bash

# Script to create SQS queues in LocalStack
# Usage: ./setup-queues.sh

set -e

# Configuration
ENDPOINT_URL="${AWS_ENDPOINT:-http://localhost:4566}"
REGION="${AWS_REGION:-us-east-1}"

# Queue names
ORDER_QUEUE="order-events"
NOTIFICATION_QUEUE="notification-events"

echo "=========================================="
echo "Setting up SQS queues in LocalStack"
echo "=========================================="
echo "Endpoint: $ENDPOINT_URL"
echo "Region: $REGION"
echo ""

# Function to create queue with error handling
create_queue() {
  local queue_name=$1
  
  echo "Creating queue: $queue_name"
  
  if aws sqs create-queue \
    --queue-name "$queue_name" \
    --endpoint-url "$ENDPOINT_URL" \
    --region "$REGION" \
    --output json > /dev/null 2>&1; then
    echo "✓ Queue '$queue_name' created successfully"
  else
    # Check if queue already exists
    if aws sqs get-queue-url \
      --queue-name "$queue_name" \
      --endpoint-url "$ENDPOINT_URL" \
      --region "$REGION" \
      --output json > /dev/null 2>&1; then
      echo "✓ Queue '$queue_name' already exists"
    else
      echo "✗ Failed to create queue '$queue_name'"
      return 1
    fi
  fi
}

# Create queues
create_queue "$ORDER_QUEUE"
create_queue "$NOTIFICATION_QUEUE"

echo ""
echo "=========================================="
echo "Queue setup complete!"
echo "=========================================="
echo ""
echo "Available queues:"
aws sqs list-queues \
  --endpoint-url "$ENDPOINT_URL" \
  --region "$REGION" \
  --output table 2>/dev/null || echo "Unable to list queues"

echo ""
echo "You can now start your application and send test messages."
