import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import net from 'node:net';
import { forwardRequest } from '../proxy-forward.js';

// Real sockets on both sides: a stand-in ZoneMinder server, and a server
// that hands every request to forwardRequest the way proxy-server.js does.
let upstream;
let proxy;
let upstreamUrl;
let proxyPort;
let streamClosed;

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));

function request({ method = 'GET', path, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: proxyPort, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() })
      );
    });
    req.on('error', reject);
    req.end(body);
  });
}

beforeAll(async () => {
  upstream = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: '/zm/index.php?view=login' });
      return res.end();
    }
    if (req.url === '/cookies') {
      res.writeHead(200, { 'Set-Cookie': ['ZMSESSID=abc; Path=/', 'zmSkin=classic; Path=/'] });
      return res.end('ok');
    }
    if (req.url === '/dies') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': '100' });
      res.write('partial');
      return setTimeout(() => res.destroy(), 20);
    }
    if (req.url === '/stream') {
      // Like nph-zms: frames keep coming until the viewer goes away.
      streamClosed = new Promise((resolve) => res.on('close', resolve));
      res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=frame' });
      res.write('--frame\r\n\r\nfirst\r\n');
      return;
    }
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: Buffer.concat(chunks).toString(),
        })
      );
    });
  });
  proxy = http.createServer((req, res) => forwardRequest(req, res, req.headers['x-target-host']));
  upstreamUrl = `http://127.0.0.1:${await listen(upstream)}`;
  proxyPort = await listen(proxy);
});

afterAll(() => {
  proxy.closeAllConnections();
  upstream.closeAllConnections();
  proxy.close();
  upstream.close();
});

describe('forwardRequest', () => {
  it('forwards path, query and headers to the target', async () => {
    const res = await request({
      path: '/api/host/getVersion.json?token=abc',
      headers: { 'X-Target-Host': upstreamUrl, Authorization: 'Bearer xyz' },
    });

    expect(res.status).toBe(200);
    const seen = JSON.parse(res.body);
    expect(seen.method).toBe('GET');
    expect(seen.url).toBe('/api/host/getVersion.json?token=abc');
    expect(seen.headers.authorization).toBe('Bearer xyz');
    // The target sees its own host name, and never the routing header.
    expect(seen.headers.host).toBe(new URL(upstreamUrl).host);
    expect(seen.headers['x-target-host']).toBeUndefined();
  });

  it('forwards the request body', async () => {
    const body = 'user=admin&pass=secret';
    const res = await request({
      method: 'POST',
      path: '/api/host/login.json',
      headers: {
        'X-Target-Host': upstreamUrl,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
      body,
    });

    const seen = JSON.parse(res.body);
    expect(seen.method).toBe('POST');
    expect(seen.body).toBe(body);
    expect(seen.headers['content-type']).toBe('application/x-www-form-urlencoded');
  });

  it('puts a path in the target in front of the requested path', async () => {
    const res = await request({
      path: '/api/monitors.json',
      headers: { 'X-Target-Host': `${upstreamUrl}/zm/` },
    });

    expect(JSON.parse(res.body).url).toBe('/zm/api/monitors.json');
  });

  it('passes redirects through without following them', async () => {
    const res = await request({ path: '/redirect', headers: { 'X-Target-Host': upstreamUrl } });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/zm/index.php?view=login');
  });

  it('keeps repeated response headers', async () => {
    const res = await request({ path: '/cookies', headers: { 'X-Target-Host': upstreamUrl } });

    expect(res.headers['set-cookie']).toEqual(['ZMSESSID=abc; Path=/', 'zmSkin=classic; Path=/']);
  });

  it('streams the response and drops the target connection when the client leaves', async () => {
    const firstChunk = await new Promise((resolve, reject) => {
      const req = http.get(
        { host: '127.0.0.1', port: proxyPort, path: '/stream', headers: { 'X-Target-Host': upstreamUrl } },
        (res) => {
          res.once('data', (chunk) => {
            resolve(chunk.toString());
            req.destroy();
          });
        }
      );
      req.on('error', reject);
    });

    // The frame arrived while the target was still sending.
    expect(firstChunk).toContain('first');
    await streamClosed;
  });

  it('survives a target that drops the connection mid-response', async () => {
    const cut = await new Promise((resolve) => {
      const req = http.get(
        { host: '127.0.0.1', port: proxyPort, path: '/dies', headers: { 'X-Target-Host': upstreamUrl } },
        (res) => {
          res.on('data', () => {});
          res.on('error', () => resolve(true));
          res.on('end', () => resolve(false));
        }
      );
      req.on('error', () => resolve(true));
    });

    // The client sees the cut instead of a short body passed off as complete.
    expect(cut).toBe(true);
    const next = await request({ path: '/api/monitors.json', headers: { 'X-Target-Host': upstreamUrl } });
    expect(next.status).toBe(200);
  });

  it('answers 500 with the error when the target hangs up without replying', async () => {
    const rude = net.createServer((socket) => socket.destroy());
    const port = await listen(rude);

    const res = await request({ path: '/api/monitors.json', headers: { 'X-Target-Host': `http://127.0.0.1:${port}` } });
    rude.close();

    expect(res.status).toBe(500);
    expect(JSON.parse(res.body).error).toMatch(/socket hang up|ECONNRESET/);
  });

  it('answers 400 when the target is not a URL', async () => {
    const res = await request({ path: '/api/monitors.json', headers: { 'X-Target-Host': 'not a url' } });

    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/X-Target-Host/);
  });
});
