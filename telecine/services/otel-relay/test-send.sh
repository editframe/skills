#!/bin/bash
# Simple test script to send sample data to the OTEL relay

# Test trace endpoint
echo "Sending test trace..."
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "test-service"}
        }]
      },
      "scopeSpans": [{
        "scope": {
          "name": "test-scope"
        },
        "spans": [{
          "traceId": "5B8EFFF798038103D269B633813FC60C",
          "spanId": "EEE19B7EC3C1B174",
          "name": "test-span",
          "kind": 1,
          "startTimeUnixNano": "1544712660000000000",
          "endTimeUnixNano": "1544712661000000000",
          "attributes": [{
            "key": "http.method",
            "value": {"stringValue": "GET"}
          }]
        }]
      }]
    }]
  }'

echo -e "\n\nSending test log..."
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "test-service"}
        }]
      },
      "scopeLogs": [{
        "scope": {
          "name": "test-logger"
        },
        "logRecords": [{
          "timeUnixNano": "1544712660000000000",
          "severityNumber": 9,
          "severityText": "INFO",
          "body": {
            "stringValue": "Test log message"
          },
          "attributes": [{
            "key": "test.attribute",
            "value": {"stringValue": "test-value"}
          }]
        }]
      }]
    }]
  }'

echo -e "\n\nDone! Check the SSE stream at http://localhost:4319/events"
