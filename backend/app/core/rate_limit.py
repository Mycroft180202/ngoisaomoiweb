import time
from fastapi import Request, HTTPException, status
from collections import defaultdict
from typing import Dict

class InMemoryRateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        # Dict mapping IP to a list of timestamps of recent requests
        self.history: Dict[str, list] = defaultdict(list)

    def check_rate_limit(self, request: Request):
        # Resolve real client IP behind Nginx reverse proxy
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        else:
            real_ip = request.headers.get("x-real-ip")
            if real_ip:
                ip = real_ip
            else:
                ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean expired timestamps
        self.history[ip] = [t for t in self.history[ip] if now - t < self.window_seconds]
        
        if len(self.history[ip]) >= self.requests_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
            )
        
        self.history[ip].append(now)

# Limit login attempts to 10 requests per minute
login_rate_limiter = InMemoryRateLimiter(requests_limit=10, window_seconds=60)

# Limit registration attempts to 5 requests per minute
register_rate_limiter = InMemoryRateLimiter(requests_limit=5, window_seconds=60)

# Limit OTP requests (SMS/Email OTP send/verify) to 5 requests per minute
otp_rate_limiter = InMemoryRateLimiter(requests_limit=5, window_seconds=60)

# Limit booking creation requests to 5 per minute per IP to prevent spamming
booking_rate_limiter = InMemoryRateLimiter(requests_limit=5, window_seconds=60)
booking_lookup_rate_limiter = InMemoryRateLimiter(requests_limit=10, window_seconds=60)
