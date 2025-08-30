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

const tsdb = axios.create({
  baseURL: "https://www.thesportsdb.com/api/v1/json/3",
  timeout: 8000
})

function normalizeName(name = ''){
  return name.toLowerCase()
    .replace(/\b(?:fc|afc)\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(and)\b/g,'&')
    .trim();
}
function buildBadges(matches = []){
  const map = new Map();
  for (const m of matches){
    const hName = normalizeName(m?.homeTeam?.name || '');
    const aName = normalizeName(m?.awayTeam?.name || '');
    const hCrest = m?.homeTeam?.crest || '';
    const aCrest = m?.awayTeam?.crest || '';
    if (hName && hCrest){
      map.set(hName,hCrest);
    }
    if (aName && aCrest){
      map.set(aName, aCrest);
    }
  }
  return map;
}

function normalizeTSDBMatches(e, crestByName){
  const toInt = (v) => {
    if (v == null || v === ''){
      return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const iso = e.strTimestamp ? e.strTimestamp : (e.dateEvent ? `${e.dateEvent}T${e.strTime || '00:00'}:00Z` : null);
  
  const home = e.strHomeTeam || '';
  const away = e.strAwayTeam || '';

  return{
    id: `tsdb-${e.idEvent}`,
    utcDate: iso,
    status: 'FINISHED',

    homeTeam: {
      id: null,
      name: home,
      crest: crestByName.get(normalizeName(home)) || null,
    },

    awayTeam: {
      id: null,
      name: away,
      crest: crestByName.get(normalizeName(away)) || null,
    },

    score: {
      fullTime: {
        home: toInt(e.intHomeScore),
        away: toInt(e.intAwayScore),
      },
    },

  };

}

function seasonTag(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;  
  const start = (m < 7) ? (y - 1) : y;
  return `${start}-${start + 1}`;    
}


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

    const crestByName = buildBadges(upcomingMatches, recentMatches);


    const season = seasonTag(currentDate);
    const tsdbSeasonResp = await tsdb.get('/eventsseason.php', { params: { id: 4328, s: season } });
    const seasonEvents = Array.isArray(tsdbSeasonResp?.data?.events) ? tsdbSeasonResp.data.events : [];


    const plEvents = seasonEvents.filter(e =>
      e?.idLeague === '4328' || /premier league/i.test(e?.strLeague || '')
    );
    const finished = plEvents.filter(e =>
      e?.intHomeScore !== '' && e?.intHomeScore != null &&
      e?.intAwayScore !== '' && e?.intAwayScore != null
    );
    console.log(finished.slice(0,3));

    const pastMatches = finished
      .map(e => normalizeTSDBMatches(e, crestByName))
      .filter(m => m.utcDate && new Date(m.utcDate) <= currentDate)
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
      .slice(0, 10);


    const payload = {upcomingMatches, recentMatches, pastMatches};
    CACHE = {ts: Date.now(), payload};
    res.json(payload);

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


