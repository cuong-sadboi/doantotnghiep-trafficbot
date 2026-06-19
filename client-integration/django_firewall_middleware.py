import time
import requests
from django.http import HttpResponse
from django.conf import settings

class DjangoFirewallMiddleware:
    def __init__(self, get_response):
        """
        Khởi tạo Django Firewall Middleware
        """
        self.get_response = get_response
        
        # Lấy cấu hình từ Django settings, sử dụng giá trị mặc định nếu không khai báo
        self.backend_url = getattr(settings, 'FIREWALL_BACKEND_URL', 'http://localhost:3001').rstrip('/')
        self.cache_ttl = getattr(settings, 'FIREWALL_CACHE_TTL', 60)
        
        # Cache trạng thái IP cục bộ: { ip: { "rule": dict, "cached_at": float } }
        self.ip_status_cache = {}
        
        # Đếm request phục vụ Rate Limiter cục bộ: { ip: { "minute_bucket": int, "count": int } }
        self.rate_limit_counter = {}

    def get_client_ip(self, request):
        """
        Lấy địa chỉ IP thật của Client (hỗ trợ đọc qua header HTTP_X_FORWARDED_FOR từ Proxy/Cloud)
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Lấy IP đầu tiên trong danh sách (IP thật của Client)
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def query_backend_status(self, ip):
        """
        Gọi API NestJS Backend để kiểm tra trạng thái IP
        """
        try:
            # Thiết lập timeout ngắn (2 giây) để tránh làm treo ứng dụng con nếu Backend gặp sự cố
            response = requests.get(
                f"{self.backend_url}/firewall/check",
                params={"ip": ip},
                timeout=2.0
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "blocked": data.get("blocked", False),
                    "action": data.get("action"),
                    "reason": data.get("reason"),
                    "requestsPerMinute": data.get("requestsPerMinute"),
                    "expiresAt": data.get("expiresAt")
                }
        except Exception as e:
            # Ghi log cảnh báo kết nối nhưng cho phép request tiếp tục đi qua
            print(f"[DjangoFirewallMiddleware] Warning: Could not connect to firewall backend: {e}")
        
        return {"blocked": False, "action": None, "reason": None, "requestsPerMinute": None, "expiresAt": None}

    def get_ip_rule(self, ip):
        """
        Lấy quy tắc Firewall áp dụng cho IP (sử dụng cache cục bộ trước)
        """
        now = time.time()
        cached = self.ip_status_cache.get(ip)
        
        # Nếu cache còn hiệu lực, trả về luôn
        if cached and (now - cached["cached_at"] < self.cache_ttl):
            return cached["rule"]
        
        # Cache hết hạn hoặc chưa có, gọi backend
        rule = self.query_backend_status(ip)
        self.ip_status_cache[ip] = {
            "rule": rule,
            "cached_at": now
        }
        return rule

    def check_rate_limit(self, ip, max_rpm):
        """
        Kiểm tra giới hạn tần suất truy cập của IP trong phút hiện tại
        """
        if not max_rpm or max_rpm <= 0:
            return True

        current_minute = int(time.time() / 60)
        counter = self.rate_limit_counter.get(ip)

        if not counter or counter["minute_bucket"] != current_minute:
            # Khởi tạo chu kỳ phút mới
            self.rate_limit_counter[ip] = {
                "minute_bucket": current_minute,
                "count": 1
            }
            return True
        
        counter["count"] += 1
        return counter["count"] <= max_rpm

    def __call__(self, request):
        ip = self.get_client_ip(request)
        rule = self.get_ip_rule(ip)

        if rule["blocked"]:
            # 1. Trường hợp chặn truy cập hoàn toàn (BLOCK)
            if rule["action"] == "BLOCK":
                reason = rule.get("reason") or "Không có lý do cụ thể"
                html_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Access Denied - Firewall Protection</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body {{ background: #0f172a; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }}
                        .container {{ max-width: 500px; padding: 2rem; border: 1px solid #ef4444; border-radius: 1rem; background: #1e293b; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }}
                        h1 {{ color: #ef4444; font-size: 2.2rem; margin-top: 0; }}
                        p {{ font-size: 1.1rem; line-height: 1.6; color: #94a3b8; }}
                        .meta {{ font-family: monospace; background: #0f172a; padding: 0.8rem; border-radius: 0.5rem; color: #f87171; text-align: left; font-size: 0.9rem; margin-top: 1.5rem; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Mất Quyền Truy Cập</h1>
                        <p>Địa chỉ IP của bạn đã tạm thời bị chặn khỏi hệ thống của chúng tôi bởi lớp bảo vệ an ninh Firewall.</p>
                        <div class="meta">
                            <strong>IP của bạn:</strong> {ip}<br>
                            <strong>Nguyên nhân:</strong> {reason}
                        </div>
                    </div>
                </body>
                </html>
                """
                return HttpResponse(html_content, status=403)

            # 2. Trường hợp giới hạn tần suất (RATE_LIMIT)
            if rule["action"] == "RATE_LIMIT":
                max_rpm = rule.get("requestsPerMinute")
                if not self.check_rate_limit(ip, max_rpm):
                    html_content = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Too Many Requests</title>
                        <meta charset="utf-8">
                        <style>
                            body {{ background: #0f172a; color: #f1f5f9; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
                            .container {{ text-align: center; max-width: 500px; padding: 2rem; border: 1px solid #f59e0b; border-radius: 1rem; background: #1e293b; }}
                            h1 {{ color: #f59e0b; }}
                            p {{ color: #94a3b8; line-height: 1.5; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Truy Cập Quá Nhanh</h1>
                            <p>Bạn đã gửi quá nhiều yêu cầu truy cập trong thời gian ngắn. Vui lòng làm chậm lại và thử lại sau ít phút.</p>
                            <p style="font-size: 0.8rem; color: #64748b;">Giới hạn tần suất: {max_rpm} RPM | IP: {ip}</p>
                        </div>
                    </body>
                    </html>
                    """
                    return HttpResponse(html_content, status=429)

        # Nếu IP an toàn, tiếp tục chuyển request cho các middleware tiếp theo/views xử lý
        response = self.get_response(request)
        return response
