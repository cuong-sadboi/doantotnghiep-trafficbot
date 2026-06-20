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

### Bước 3.2: Tích hợp vào ứng dụng Django (Cơ chế Webhook đẩy ngược)

Nếu web con của bạn viết bằng **Django** và chạy trên PythonAnywhere (bị giới hạn Outbound Proxy), hãy sử dụng cơ chế đồng bộ Webhook (Backend chủ động đẩy danh sách IP bị chặn về Django lưu trữ cục bộ):

1. **Thêm mã nguồn Middleware và Webhook view**:
   - Sao chép file [django_firewall_middleware.py](file:///c:/Users/Admin/Desktop/doantotnghiep/client-integration/django_firewall_middleware.py) vào thư mục dự án Django của bạn (ví dụ: cùng cấp với `settings.py`).
   - Sao chép file [django_webhook_view.py](file:///c:/Users/Admin/Desktop/doantotnghiep/client-integration/django_webhook_view.py) vào cùng thư mục đó.

2. **Đăng ký Middleware** trong file `settings.py` của Django:
   ```python
   MIDDLEWARE = [
       # Khuyên dùng đặt ở dòng đầu tiên để chặn request sớm nhất
       'myapp.django_firewall_middleware.DjangoFirewallMiddleware',
       'django.middleware.security.SecurityMiddleware',
       'django.contrib.sessions.middleware.SessionMiddleware',
       'django.middleware.common.CommonMiddleware',
       # ... các middleware khác ...
   ]
   ```

3. **Cấu hình Token Bảo Mật** ở cuối file `settings.py`:
   ```python
   # Token bảo mật dùng để xác thực request đẩy về từ Backend NestJS
   # Hãy chọn một chuỗi bảo mật ngẫu nhiên và cấu hình khớp với NestJS Backend
   FIREWALL_WEBHOOK_TOKEN = "your_secure_secret_token"
   ```

4. **Đăng ký Webhook Router** trong file `urls.py` của Django:
   ```python
   from django.urls import path
   # Thay 'myapp' bằng tên thư mục chứa file view của bạn
   from myapp.django_webhook_view import firewall_webhook

   urlpatterns = [
       path('firewall/webhook/', firewall_webhook, name='firewall_webhook'),
       # ... các path khác ...
   ]
   ```

---

## Cấu hình ở Backend NestJS để đẩy Webhook

Để Backend NestJS tự động gọi Webhook đồng bộ sang Django, hãy khai báo các biến môi trường sau trong file `.env` của NestJS Backend:

```env
# Đường dẫn Webhook của trang Django (chạy online hoặc local)
FIREWALL_WEBHOOK_URL=https://cuong1512.pythonanywhere.com/firewall/webhook/

# Token bảo mật (khớp với FIREWALL_WEBHOOK_TOKEN bên Django)
FIREWALL_WEBHOOK_TOKEN=your_secure_secret_token
```

Khi bất kỳ quy tắc chặn IP nào được thiết lập (hoặc gỡ bỏ), Backend sẽ tự động gọi HTTP POST đồng bộ sang Django để cập nhật file `blocked_ips.json` cục bộ, giúp việc chặn IP trên Web con hoạt động trơn tru với độ trễ ~0ms.


