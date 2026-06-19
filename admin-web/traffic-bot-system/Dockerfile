# Giai đoạn Build
FROM node:20-alpine AS builder

WORKDIR /app

# Next.js sẽ tự động đọc file .env được sao chép vào qua lệnh COPY . . để nhúng vào bundle khi build

# Sao chép package.json và cài đặt dependencies
COPY package*.json ./
RUN npm ci

# Sao chép mã nguồn và build dự án
COPY . .
RUN npm run build

# Giai đoạn Chạy (Runtime)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Sao chép package.json và cài đặt production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Sao chép kết quả build từ builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Khai báo cổng chạy frontend
EXPOSE 3000

CMD ["npm", "run", "start"]
