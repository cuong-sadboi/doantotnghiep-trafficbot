import json
import os
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# Đường dẫn lưu file JSON chứa các IP bị chặn (nằm ở thư mục gốc của Django dự án)
BLOCKED_IPS_FILE = os.path.join(settings.BASE_DIR, 'blocked_ips.json')

@csrf_exempt
def firewall_webhook(request):
    """
    Webhook tiếp nhận đồng bộ danh sách IP bị chặn từ NestJS Backend (Render)
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    # Lấy token bảo mật từ header để kiểm tra tính hợp lệ
    token = request.headers.get('X-Firewall-Token')
    expected_token = getattr(settings, 'FIREWALL_WEBHOOK_TOKEN', None)
    
    if not expected_token or token != expected_token:
        return HttpResponseForbidden("Unauthorized: Invalid or missing firewall token")
        
    try:
        data = json.loads(request.body)
        rules = data.get("rules", [])
        
        # Ghi danh sách các luật chặn IP vào file JSON cục bộ
        with open(BLOCKED_IPS_FILE, 'w', encoding='utf-8') as f:
            json.dump(rules, f, indent=4)
            
        print(f"[FirewallWebhook] Đồng bộ thành công {len(rules)} quy tắc chặn từ backend.")
        return JsonResponse({"success": True, "message": f"Successfully updated {len(rules)} rules."})
    except Exception as e:
        print(f"[FirewallWebhook] Lỗi xử lý webhook: {e}")
        return JsonResponse({"error": str(e)}, status=400)
