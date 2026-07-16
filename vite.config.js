import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file from the current directory.
  // The third parameter '' loads all env variables regardless of VITE_ prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000
    },
    plugins: [
      {
        name: 'openrouter-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url.split('?')[0];
            if (url === '/api/chat' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(body);
                  const { messages, systemPrompt, model, apiKey: clientApiKey } = parsed;

                  const apiKey = clientApiKey || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
                  if (!apiKey) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY is not defined. Please add it to your .env file.' }));
                    return;
                  }

                  const payload = {
                    model: model || 'google/gemini-2.5-flash',
                    messages: [
                      { role: 'system', content: systemPrompt },
                      ...messages
                    ]
                  };

                  const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${apiKey}`,
                      'HTTP-Referer': 'http://localhost:3000',
                      'X-Title': 'Quatuor Prototype'
                    },
                    body: JSON.stringify(payload)
                  });

                  if (!apiResponse.ok) {
                    const errText = await apiResponse.text();
                    res.writeHead(apiResponse.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `OpenRouter API error: ${errText}` }));
                    return;
                  }

                  const data = await apiResponse.json();
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(data));
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: `Proxy Error: ${err.message}` }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ]
  };
});
