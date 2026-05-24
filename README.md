# DO AN TOT NGHIEP — Traffic Bot & System Management

Đây là repository dự án tốt nghiệp, bao gồm giao diện, dịch vụ AI và hệ thống backend quản lý.

## Tổng quan
- **Mục tiêu:** Hệ thống phân tích lưu lượng (traffic), sinh dữ liệu tổng hợp, và quản lý người dùng/streams cho môi trường demo.
- **Các thành phần chính:**
  - `admin-web/traffic-bot-system`: Frontend Next.js (giao diện quản trị).
  - `AI-service/`: Dịch vụ Python cho huấn luyện, dự đoán và xử lý log.
  - `system-management/`: Backend (NestJS/Node) và cấu hình hệ thống, bao gồm Docker compose và database mẫu.

## Cấu trúc thư mục (tóm tắt)
- `admin-web/traffic-bot-system/` — Next.js app (frontend).
- `AI-service/` — Python scripts và model (app.py, train.py, predict.py, requirements.txt).
- `system-management/` — NestJS backend, `docker-compose.yml`, data MongoDB mẫu trong `data/mongodb/`.
- `test/` — test e2e cho backend.

## Yêu cầu cơ bản
- Node.js (v16+ hoặc phiên bản tương thích với Next.js dự án).
- npm hoặc yarn.
- Python 3.8+ (cho `AI-service`).
- Docker & Docker Compose (nếu chạy database bằng Docker).

## Hướng dẫn nhanh — Chạy toàn bộ hệ thống (local)
1. Khởi động database (MongoDB) — dùng Docker Compose (từ `system-management`):

```bash
cd system-management
docker-compose up -d
```

2. Chạy backend (system-management):

```bash
cd system-management
npm install
npm run start:dev
```

3. Chạy dịch vụ AI (AI-service):

```bash
cd AI-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python app.py
```

4. Chạy frontend quản trị (admin-web):

```bash
cd admin-web/traffic-bot-system
npm install
npm run dev
```

Sau khi các dịch vụ chạy, mở trình duyệt vào đường dẫn mà frontend hoặc backend báo để sử dụng giao diện.

## Hướng dẫn phát triển
- Mỗi thành phần có `package.json` hoặc `requirements.txt` riêng, chuyển vào thư mục tương ứng để cài đặt phụ thuộc.
- Kiểm tra và cập nhật biến môi trường trong từng module nếu cần (backend, AI-service, frontend).

## Tệp quan trọng
- `admin-web/traffic-bot-system/package.json` — scripts frontend.
- `AI-service/requirements.txt` — dependencies Python.
- `system-management/docker-compose.yml` — cấu hình Docker cho DB.

## Chạy test
- Backend e2e (ví dụ):

```bash
cd system-management
npm run test:e2e
```

----
Lưu ý: README này là tổng quan. Mỗi module (frontend/backend/AI) có thể cần README chi tiết hơn.
