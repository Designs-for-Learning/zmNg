import http from 'http';
import https from 'https';

function sendError(res, status, message) {
  if (res.headersSent) {
    // Part of the response is already out; all that is left is to cut it.
    res.destroy();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

/**
 * Send the incoming request to targetHost and stream the answer back.
 * Redirects, cookies and compressed bodies pass through untouched, so the
 * browser sees what the server sent.
 */
export function forwardRequest(req, res, targetHost) {
  let target;
  try {
    target = new URL(targetHost);
  } catch {
    return sendError(res, 400, `X-Target-Host is not a URL: ${targetHost}`);
  }

  // The server must see its own host name, and not our routing header.
  const headers = { ...req.headers, host: target.host, connection: 'close' };
  delete headers['x-target-host'];

  const client = target.protocol === 'https:' ? https : http;
  const upstream = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      // A path in the target (e.g. /zm) goes in front of the requested path.
      path: target.pathname.replace(/\/$/, '') + req.url,
      headers,
      agent: false,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
      // If the server drops mid-response, cut the client too instead of
      // leaving it waiting for the rest.
      upstreamRes.on('error', () => res.destroy());
      upstreamRes.pipe(res);
    }
  );

  upstream.on('error', (err) => {
    if (res.destroyed) return; // the browser left first
    console.error('[Proxy Error]', err.message);
    sendError(res, 500, err.message);
  });

  // Streams (nph-zms) never end on their own; stop when the browser leaves.
  res.on('close', () => upstream.destroy());

  req.pipe(upstream);
}
