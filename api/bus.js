export default async function handler(req, res) {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Bus stop code required' });
  }

  try {
    const response = await fetch(
      `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${code}`,
      {
        headers: {
          AccountKey: 'yGlKh9z3TFeKg7zzBerzAQ==',
          Accept: 'application/json',
        },
      }
    );
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch bus data' });
  }
}