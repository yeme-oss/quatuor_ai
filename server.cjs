// Standalone Quatuor server, packaged into the release .exe.
// Serves the built app from dist/ and proxies /api/chat to OpenRouter,
// mirroring the dev proxy in vite.config.js. No dependencies.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Load OPENROUTER_API_KEY from a .env file sitting next to the .exe
// (or in the working directory), so users can configure it without a terminal.
function loadEnvKey() {
  const candidates = [
    path.join(path.dirname(process.execPath), '.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const file of candidates) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const match = content.match(/^\s*OPENROUTER_API_KEY\s*=\s*(.+)\s*$/m);
      if (match) {
        const value = match[1].trim().replace(/^["']|["']$/g, '');
        if (value && !value.startsWith('your_')) return value;
      }
    } catch {
      // file absent: try next candidate
    }
  }
  return process.env.OPENROUTER_API_KEY || '';
}

const envApiKey = loadEnvKey();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function handleChat(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { messages, systemPrompt, model, apiKey: clientApiKey } = JSON.parse(body);

      const apiKey = clientApiKey || envApiKey;
      if (!apiKey) {
        sendJson(res, 500, { error: 'OPENROUTER_API_KEY is not defined. Create a .env file next to the executable, or paste a key in the configuration sidebar.' });
        return;
      }

      const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:' + PORT,
          'X-Title': 'Quatuor Prototype',
        },
        body: JSON.stringify({
          model: model || 'openai/gpt-5.6-terra',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      });

      if (!apiResponse.ok) {
        const errText = await apiResponse.text();
        sendJson(res, apiResponse.status, { error: `OpenRouter API error: ${errText}` });
        return;
      }

      const data = await apiResponse.json();
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 500, { error: `Proxy Error: ${err.message}` });
    }
  });
}

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  // Resolve inside dist/ only; anything path-traversal-ish falls back to index.html
  let relative = path.normalize(urlPath).replace(/^([/\\])+/, '');
  if (relative === '' || relative === '.' || relative.startsWith('..')) relative = 'index.html';
  let filePath = path.join(DIST_DIR, relative);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, html) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
        res.end(html);
      });
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/api/chat' && req.method === 'POST') {
    handleChat(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  🎭 Quatuor is running at ${url}`);
  console.log(envApiKey
    ? '  API key loaded from .env'
    : '  No .env API key found - paste one in the configuration sidebar (or create a .env file next to the exe).');
  console.log('  Press Ctrl+C to quit.\n');

  // Auto-open the default browser (skippable with QUATUOR_NO_OPEN=1)
  if (!process.env.QUATUOR_NO_OPEN) {
    const opener = process.platform === 'win32' ? `start "" ${url}`
      : process.platform === 'darwin' ? `open ${url}`
      : `xdg-open ${url}`;
    exec(opener);
  }
});
