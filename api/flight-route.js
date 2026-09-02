module.exports = async function handler(req, res) {
  const from = (req.query.from || '').toUpperCase();
  const to = (req.query.to || '').toUpperCase();

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to parameters are required' });
  }

  try {
    const searchUrl = "https://api.flightplandatabase.com/search/plans?fromICAO=" + from + "&toICAO=" + to + "&limit=10";
    const searchRes = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!searchRes.ok) throw new Error("FPD search failed: " + searchRes.status);

    const plans = await searchRes.json();
    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(200).json({ route: 'DCT', distance: null, waypoints: [], source: null });
    }

    plans.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const bestPlan = plans[0];

    const planRes = await fetch("https://api.flightplandatabase.com/plan/" + bestPlan.id, {
      headers: { 'Accept': 'application/json' }
    });

    if (!planRes.ok) throw new Error("FPD plan fetch failed: " + planRes.status);

    const planData = await planRes.json();
    const nodes = planData.route ? planData.route.nodes || [] : [];

    const waypoints = nodes.map(node => ({
      ident: node.ident,
      type: node.type,
      lat: node.lat,
      lon: node.lon,
      alt: node.alt,
      via: node.via ? node.via.ident : null,
      viaType: node.via ? node.via.type : null,
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
    const cruiseAlt = altMatch ? parseInt(altMatch[1], 10) : (bestPlan.maxAltitude || null);

    const airways = Array.from(new Set(
      nodes
        .filter(n => n.via && n.via.type && n.via.type.startsWith('AWY'))
        .map(n => n.via.ident)
    )).slice(0, 6);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({
      route: routeClean || 'DCT',
      distance: Math.round(planData.distance || bestPlan.distance || 0),
      waypoints,
      cruiseAltitude: cruiseAlt,
      waypointCount: innerNodes.length,
      airways,
      source: {
        name: 'Flight Plan Database',
        url: "https://flightplandatabase.com/plan/" + bestPlan.id,
        popularity: bestPlan.popularity || 0,
        cycle: planData.cycle ? planData.cycle.ident : null,
        username: planData.user ? planData.user.username : null,
      }
    });

  } catch (error) {
    console.error('Flight Route API Error:', error);
    return res.status(200).json({
      route: 'DCT',
      distance: null,
      waypoints: [],
      source: null,
      error: error.message || String(error)
    });
  }
};
