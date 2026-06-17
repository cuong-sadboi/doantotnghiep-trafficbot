FROM python:3.10-slim

WORKDIR /app

# Cài đặt các thư viện cần thiết
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn và mô hình huấn luyện
COPY . .

# Khai báo cổng chạy ứng dụng
EXPOSE 5000

ENV PORT=5000
ENV DEBUG=false

CMD ["python", "app.py"]
