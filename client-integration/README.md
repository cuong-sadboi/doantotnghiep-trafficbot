# Hướng dẫn Tích hợp Firewall Middleware cho Web Con (Client Web)

Tài liệu này hướng dẫn cách nhúng Firewall Middleware vào mã nguồn Web con (ví dụ: Flask Web App chạy trên PythonAnywhere) để thực hiện chặn IP hoặc giới hạn tần suất truy cập (Rate Limiting) thời gian thực theo cấu hình từ hệ thống quản trị `Log Curator`.

## Nguyên lý Hoạt động

Khi có request mới đi vào Web con:
1. Middleware sẽ trích xuất địa chỉ IP của client (hỗ trợ đọc qua Proxy Header như `X-Forwarded-For` trên PythonAnywhere).
2. Kiểm tra trạng thái IP này trong **Bộ nhớ đệm cục bộ (Local Cache)** của Web con để tránh gọi HTTP Request liên tục làm giảm hiệu năng:
   - Nếu tìm thấy và còn hạn (TTL = 60 giây): Áp dụng luật ngay lập tức.
   - Nếu không tìm thấy hoặc hết hạn: Gửi một request nhanh tới NestJS Backend: `GET <BACKEND_URL>/firewall/check?ip=<IP>`.
3. Hành vi xử lý tương ứng:
   - **Chặn hoàn toàn (`BLOCK`)**: Trả về mã lỗi `HTTP 403 Forbidden` kèm giao diện thông báo chặn.
   - **Giới hạn tần suất (`RATE_LIMIT`)**: Tăng bộ đếm request của IP đó trong phút hiện tại. Nếu vượt quá số RPM (Requests Per Minute) được cấu hình, trả về mã lỗi `HTTP 429 Too Many Requests`.
   - **Bình thường**: Cho phép truy cập vào logic xử lý chính của ứng dụng.

---

## Các bước Cài đặt

### Bước 1: Khai báo File Middleware

Sao chép file [firewall_middleware.py](file:///c:/Users/Admin/Desktop/doantotnghiep/client-integration/firewall_middleware.py) vào thư mục dự án của Web con.

### Bước 2: Cài đặt thư viện cần thiết

Đảm bảo môi trường Python của Web con có cài đặt thư viện `requests`:
```bash
pip install requests
```

### Bước 3: Tích hợp vào ứng dụng Flask chính

Sử dụng decorator `@app.before_request` trong Flask để cấu hình Middleware chạy trước mọi request:

```python
from flask import Flask, jsonify
from firewall_middleware import FirewallMiddleware

app = Flask(__name__)

# Khởi tạo Firewall Middleware
# Thay đổi URL của NestJS Backend tương ứng với môi trường chạy (Local hoặc Production)
firewall = FirewallMiddleware(backend_url="http://localhost:3001")

@app.before_request
def check_firewall_rules():
    # Gọi hàm intercept của middleware
    # Nếu IP bị chặn hoặc giới hạn, hàm này sẽ tự động trả về Response 403/429 phù hợp
    response = firewall.intercept()
    if response:
        return response

@app.route("/")
def index():
    return jsonify({"message": "Welcome to the client website!"})

if __name__ == "__main__":
    app.run(port=8000)
```

### Bước 3.2: Tích hợp vào ứng dụng Django

Nếu web con của bạn viết bằng **Django**, hãy thực hiện như sau:

1. Sao chép file [django_firewall_middleware.py](file:///c:/Users/Admin/Desktop/doantotnghiep/client-integration/django_firewall_middleware.py) vào thư mục dự án của bạn (ví dụ: cùng cấp với `settings.py`).
2. Đăng ký Middleware trong file `settings.py` bằng cách thêm đường dẫn import của `DjangoFirewallMiddleware` vào danh sách `MIDDLEWARE` (khuyên dùng đặt ở dòng đầu tiên để chặn request sớm nhất):

```python
MIDDLEWARE = [
    # Thay 'myapp' bằng tên thư mục chứa file middleware của bạn
    'myapp.django_firewall_middleware.DjangoFirewallMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... các middleware khác ...
]
```

3. Thêm cấu hình xuống cuối file `settings.py` (tùy chọn):

```python
# Địa chỉ gốc của NestJS Backend
FIREWALL_BACKEND_URL = "http://localhost:3001"

# Thời gian sống (giây) của bộ đệm cache trạng thái IP (mặc định: 60)
FIREWALL_CACHE_TTL = 60
```

---

## Các cấu hình nâng cao trong Middleware

Bạn có thể chỉnh sửa các tham số trong Middleware để tối ưu hóa hiệu năng:
- **`cache_ttl`**: Thời gian cache trạng thái IP từ backend (mặc định là `60` giây). Giúp giảm tải tối đa cho NestJS Backend.
- **`timeout`**: Thư viện HTTP Request được cấu hình timeout ngắn (`timeout=2.0` giây) để đảm bảo nếu Backend NestJS gặp sự cố hoặc offline, Web con vẫn tiếp tục hoạt động bình thường mà không bị treo request của người dùng.

