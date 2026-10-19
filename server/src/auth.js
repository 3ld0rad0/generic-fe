import crypto from 'node:crypto';

const TTL_MS = 12 * 60 * 60 * 1000;

const sign = (secret, payload) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export function createAuth({ password, secret }) {
  const issue = () => {
    const exp = String(Date.now() + TTL_MS);
    return `${exp}.${sign(secret, exp)}`;
  };

  const verify = (token = '') => {
    const [exp, sig] = token.split('.');
    if (!exp || !sig) return false;
    if (!safeEqual(sig, sign(secret, exp))) return false;
    return Number(exp) > Date.now();
  };

  const login = (candidate) => (safeEqual(candidate ?? '', password) ? issue() : null);

  const requireAdmin = (req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!verify(token)) return res.status(401).json({ error: 'Non autorizzato' });
    next();
  };

  return { login, requireAdmin };
}
