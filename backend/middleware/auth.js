const jwt = require('jsonwebtoken');

function requireAuth(...allowedRoles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Login आवश्यक आहे.' });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'या क्रियेसाठी परवानगी नाही.' });
      }
      req.user = payload; // { role, id }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Session संपली आहे, कृपया पुन्हा Login करा.' });
    }
  };
}

module.exports = { requireAuth };
