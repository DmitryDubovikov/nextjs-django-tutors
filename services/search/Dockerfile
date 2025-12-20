FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o /search ./cmd/search

FROM alpine:3.21
RUN apk --no-cache add ca-certificates curl
COPY --from=builder /search /search
EXPOSE 8080
CMD ["/search"]
