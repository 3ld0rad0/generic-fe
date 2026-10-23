import hashlib
import hmac
import secrets
import threading
import time

from fastapi import HTTPException, Request

TTL_MS = 12 * 60 * 60 * 1000


def _now_ms():
    return int(time.time() * 1000)


def _sign(secret, payload):
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def _safe_equal(a, b):
    ha = hashlib.sha256(str(a).encode()).digest()
    hb = hashlib.sha256(str(b).encode()).digest()
    return hmac.compare_digest(ha, hb)


class Auth:
    def __init__(self, password, secret):
        self.password = password
        self.secret = secret
        self._sessions = {}
        self._lock = threading.Lock()

    def _session_key(self, token):
        credential = hashlib.sha256(self.password.encode()).hexdigest()
        return _sign(self.secret, f"{credential}:{token}")

    def _issue(self):
        token = secrets.token_urlsafe(32)
        with self._lock:
            now = _now_ms()
            self._sessions = {key: expiry for key, expiry in self._sessions.items() if expiry > now}
            self._sessions[self._session_key(token)] = now + TTL_MS
        return token

    def _verify(self, token):
        if not token:
            return False
        key = self._session_key(token)
        with self._lock:
            if self._sessions.get(key, 0) > _now_ms():
                return True
            self._sessions.pop(key, None)
        return False

    def revoke(self, token):
        with self._lock:
            self._sessions.pop(self._session_key(token), None)

    def login(self, candidate):
        if not isinstance(candidate, str):
            candidate = ""
        return self._issue() if _safe_equal(candidate, self.password) else None

    def require_admin(self, request: Request):
        header = request.headers.get("authorization", "")
        token = header[7:] if header.startswith("Bearer ") else ""
        if not self._verify(token):
            raise HTTPException(401, "Non autorizzato")
        return token
