module.exports = async function handler(req, res) {
  const ids = req.query.ids;
  if (!ids) {
    return res.status(400).json({ error: 'ids parameter is required' });
  }
  try {
    const url = "https://aviationweather.gov/api/data/metar?ids=" + encodeURIComponent(ids) + "&format=json";
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Hosak-Virtual-Flight-Finder/1.0' }
    });
    if (!response.ok) throw new Error("AviationWeather returned status " + response.status);
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (error) {
    console.error('METAR API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch METAR' });
  }
};
