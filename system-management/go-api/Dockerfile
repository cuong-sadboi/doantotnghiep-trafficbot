# Giai đoạn Build
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Sao chép tệp mã nguồn duy nhất
COPY api.go .

# Khởi tạo go mod tạm thời và biên dịch tĩnh (static build) để chạy không cần Go runtime
RUN go mod init go-api && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o api api.go

# Giai đoạn Chạy (Runtime)
FROM alpine:latest

WORKDIR /

# Sao chép file chạy từ builder
COPY --from=builder /app/api /api

# Khai báo cổng chạy Go API
EXPOSE 8080

CMD ["/api"]
