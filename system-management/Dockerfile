# Giai đoạn Build
FROM node:20-alpine AS builder

WORKDIR /app

# Sao chép file cấu hình và cài đặt dependencies
COPY package*.json ./
RUN npm ci

# Sao chép mã nguồn và biên dịch TypeScript sang JS
COPY . .
RUN npm run build

# Giai đoạn Chạy (Runtime)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Sao chép package.json và cài đặt dependencies cho production
COPY package*.json ./
RUN npm ci --omit=dev

# Sao chép kết quả build từ giai đoạn trước
COPY --from=builder /app/dist ./dist

# Khai báo cổng chạy backend
EXPOSE 3001

CMD ["node", "dist/main.js"]
