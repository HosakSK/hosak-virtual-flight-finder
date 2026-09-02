const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

async function handleApi(req, res, parsedUrl) {
  const { pathname, query } = parsedUrl;

  if (pathname === '/api/metar') {
    const ids = query.ids;
    if (!ids) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'ids parameter is required' }));
    }
    try {
      const apiUrl = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(ids)}&format=json`;
      const apiRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Virtual-Flight-Finder/1.0' }
      });
      const data = await apiRes.json();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (pathname === '/api/taf') {
    const ids = query.ids;
    if (!ids) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'ids parameter is required' }));
    }
    try {
      const apiUrl = `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(ids)}&format=json`;
      const apiRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Virtual-Flight-Finder/1.0' }
      });
      const data = await apiRes.json();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (pathname === '/api/flight-route') {
    const from = (query.from || '').toUpperCase();
    const to = (query.to || '').toUpperCase();
    if (!from || !to) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'from and to parameters are required' }));
    }
    try {
      const searchUrl = `https://api.flightplandatabase.com/search/plans?fromICAO=${from}&toICAO=${to}&limit=10`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' }
      });
      if (!searchRes.ok) throw new Error(`FPD search failed: ${searchRes.status}`);
      const plans = await searchRes.json();
      if (!Array.isArray(plans) || plans.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ route: 'DCT', distance: null, waypoints: [], source: null }));
      }
      plans.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      const bestPlan = plans[0];
      const planRes = await fetch(`https://api.flightplandatabase.com/plan/${bestPlan.id}`, {
        headers: { 'Accept': 'application/json' }
      });
      const planData = await planRes.json();
      const nodes = planData.route?.nodes || [];
      const waypoints = nodes.map(n => ({
        ident: n.ident,
        type: n.type,
        lat: n.lat,
        lon: n.lon,
        alt: n.alt,
        via: n.via?.ident ?? null,
        viaType: n.via?.type ?? null,
      }));
      const innerNodes = nodes.filter(n => n.type !== 'APT');
      let routeString = planData.routeString || '';
      if (!routeString && innerNodes.length > 0) {
        const parts = [];
        for (const node of innerNodes) {
          if (node.via) parts.push(node.via.ident);
          parts.push(node.ident);
        }
        routeString = parts.filter((v, i, a) => i === 0 || v !== a[i - 1]).join(' ');
      }
      const words = routeString.trim().split(/\s+/);
      if (words[0] === from) words.shift();
      if (words[words.length - 1] === to) words.pop();
      const routeClean = words.join(' ');
      const notes = planData.notes || '';
      const altMatch = notes.match(/Cruise Altitude:\s*(\d+)ft/);
      const cruiseAlt = altMatch ? parseInt(altMatch[1]) : (bestPlan.maxAltitude ?? null);
      const airways = [...new Set(nodes.filter(n => n.via?.type?.startsWith('AWY')).map(n => n.via.ident))].slice(0, 6);

      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({
        route: routeClean || 'DCT',
        distance: Math.round(planData.distance ?? bestPlan.distance ?? 0),
        waypoints,
        cruiseAltitude: cruiseAlt,
        waypointCount: innerNodes.length,
        airways,
        source: {
          name: 'Flight Plan Database',
          url: `https://flightplandatabase.com/plan/${bestPlan.id}`,
          popularity: bestPlan.popularity ?? 0,
          cycle: planData.cycle?.ident ?? null,
          username: planData.user?.username ?? null,
        }
      }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ route: 'DCT', distance: null, waypoints: [], source: null, error: e.message }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    return handleApi(req, res, parsedUrl);
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`✈️ Virtual Flight Finder running at http://localhost:${PORT}`);
});
