// Local development only. Never deployed.
import http from 'node:http';
import { POST } from './api/gemini.js';

console.log('GEMINI_API_KEY loaded:', Boolean(process.env.GEMINI_API_KEY)); // true/false only

http
  .createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/gemini') {
      res.writeHead(404).end();
      return;
    }
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const request = new Request('http://localhost/api/gemini', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: Buffer.concat(chunks),
      });
      const response = await POST(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error('dev-api error:', err?.name);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Local dev server error.' }));
    }
  })
  .listen(3001, () => console.log('Local API on http://localhost:3001'));