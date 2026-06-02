// api/publisher.js
const fs = require('fs');
const path = require('path');
const { isAuthenticated } = require('../lib/auth');

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    return res.end();
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'publisher.html');
    const html = fs.readFileSync(filePath, 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(html);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Error loading publisher page: ' + err.message);
  }
};
