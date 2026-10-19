import hashlib
import hmac
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

    def _issue(self):
        exp = str(_now_ms() + TTL_MS)
        return f"{exp}.{_sign(self.secret, exp)}"

    def _verify(self, token):
        exp, _, sig = token.partition(".")
        if not exp or not sig:
            return False
        if not _safe_equal(sig, _sign(self.secret, exp)):
            return False
        return exp.isdigit() and int(exp) > _now_ms()

    def login(self, candidate):
        if not isinstance(candidate, str):
            candidate = ""
        return self._issue() if _safe_equal(candidate, self.password) else None

    def require_admin(self, request: Request):
        header = request.headers.get("authorization", "")
        token = header[7:] if header.startswith("Bearer ") else header
        if not self._verify(token):
            raise HTTPException(401, "Non autorizzato")
