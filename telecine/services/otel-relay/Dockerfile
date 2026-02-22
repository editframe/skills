FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
COPY *.go ./

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o otel-relay .

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/otel-relay .

EXPOSE 4317 4318 4319

CMD ["./otel-relay"]
