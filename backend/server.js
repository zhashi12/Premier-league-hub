const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { set } = require('mongoose');
const app = express();

app.use(cors());
let CACHE = { ts: 0, payload: null };
const TTL_MS = 60_000; // 60s
const fd = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {'X-Auth-Token': '7d252203991e4fa48ea51dd3231ca293'},
  timeout: 8000
} 
)

const TDSB = axios.create({
  baseURL: "https://www.thesportsdb.com/api/v1/json/3",
  timeout: 8000
})
console.log({TDSB});
/*
function normalizeName(name = ''){
  return name.toLowerCase()
    .replace(/\b(?:fc|afc)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const BADGE_BY_TEAMNAME = new Map();
let badgesLoaded = false;
*/
const normalizeFDMatch = require('./normaliseFDMatch');

app.get('/api/matches', async (req, res) => {
  try {
    if (Date.now() - CACHE.ts < TTL_MS && CACHE.payload) {
      return res.json(CACHE.payload);
    }
    const currentDate = new Date();
    const [fdTodayResp, fdSchedResp] = await Promise.all([
        fd.get('/matches', { params: { competitions: 'PL'} }),
        fd.get('/competitions/PL/matches', { params: { status: 'SCHEDULED' } }),
    ])
    const fdToday  = Array.isArray(fdTodayResp?.data?.matches) ? fdTodayResp.data.matches : [];
    const fdSched = Array.isArray(fdSchedResp?.data?.matches) ? fdSchedResp.data.matches : [];

    const upcomingMatches = fdSched
      .filter(m => new Date(m.utcDate) > currentDate)                 
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))      
      .slice(0, 10)
      .map(normalizeFDMatch);                                          

    const recentMatches = fdToday
      .filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))     
      .slice(0, 10)
      .map(normalizeFDMatch);
    const pastMatches = [];
    res.json({ upcomingMatches, recentMatches, pastMatches});

  } catch (error) {
  console.error('[fetch error]',
    {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      params: error.config?.params
    }
  );
  res.status(500).json({ error: 'Failed to fetch matches' });
}
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))


