const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { set } = require('mongoose');
const app = express();

app.use(cors());
let CACHE = { ts: 0, payload: null };
const TTL_MS = 60_000; // 60s

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const fd = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN},
  timeout: 8000
} 
)
const tsdb = axios.create({
  baseURL: "https://www.thesportsdb.com/api/v1/json/",
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
    const ignoreCache = req.query.fresh === '1';
    if (!ignoreCache && Date.now() - CACHE.ts < TTL_MS && CACHE.payload) {
      return res.json(CACHE.payload);
    }

    const currentDate = new Date();
    const [fdInPlay, fdPaused, fdLive, fdStandings, fdSchedResp] = await Promise.all([
        fd.get('/matches', { params:{competitions: 'PL',  status: 'IN_PLAY'} }),
        fd.get('/matches', { params: {competitions: 'PL', status: 'PAUSED'}}),
        fd.get('/matches', { params: {competitions: 'PL', status: 'LIVE'}}),
        fd.get('/competitions/PL/standings'),
        fd.get('/competitions/PL/matches', { params: { status: 'SCHEDULED' } }),
    ])
    const inPlay = Array.isArray(fdInPlay?.data?.matches) ? fdInPlay.data.matches : [];
    const paused = Array.isArray(fdPaused?.data?.matches) ? fdPaused.data.matches : [];
    const live   = Array.isArray(fdLive?.data?.matches)   ? fdLive.data.matches   : [];


    const table = fdStandings?.data.standings[0]?.table ? fdStandings.data.standings[0]?.table : [];
    console.log(table);

    const fdToday = [...live, ...inPlay, ...paused];

    const fdSched = Array.isArray(fdSchedResp?.data?.matches) ? fdSchedResp.data.matches : [];

    let upcomingMatches = fdSched
      .filter(m => new Date(m.utcDate) > currentDate)                 
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))      
      .slice(0, 50)
      .map(normalizeFDMatch);                                          

    const recentMatches = fdToday
    .sort((a,b) => new Date(b.utcDate) - new Date(a.utcDate))
    .slice(0,10)
    .map(normalizeFDMatch);

    const crestByName = buildBadges(upcomingMatches);
    upcomingMatches = upcomingMatches.slice(0,10);




    const season = seasonTag(currentDate);
    const tsdbSeasonResp = await tsdb.get('3/eventsseason.php', { params: { id: 4328, s: season } });
    const seasonEvents = Array.isArray(tsdbSeasonResp?.data?.events) ? tsdbSeasonResp.data.events : [];


    const plEvents = seasonEvents.filter(e =>
      e?.idLeague === '4328' || /premier league/i.test(e?.strLeague || '')
    );
    const finished = plEvents.filter(e =>
      e?.intHomeScore !== '' && e?.intHomeScore != null &&
      e?.intAwayScore !== '' && e?.intAwayScore != null
    );
    //console.log(finished.slice(0,3));


    const pastMatches = finished
      .map(e => normalizeTSDBMatches(e, crestByName))
      .filter(m => m.utcDate && new Date(m.utcDate) <= currentDate)
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
      .slice(0, 10);


    const payload = {upcomingMatches, recentMatches, pastMatches, table};
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



app.get('/api/matches/:id/details', async (req,res) =>{
  const { id } =req.params;
  console.log({id});
  try{
    let payload=null;
    if (/^tsdb-/.test(id)) {
      // TheSportsDB by event id
      const rawId = id.replace(/^tsdb-/, '');
      const [r,match,mtimeline] = await Promise.all ([
        tsdb.get('123/lookupevent.php', { params: { id: rawId } }),
        tsdb.get('123/lookupeventstats.php',{params: {id: rawId}}),
        tsdb.get('123/lookuptimeline.php', {params: {id: rawId}})
      ])
      const event = Array.isArray(r?.data?.events) ? r.data.events[0] : null;
      //console.log(match);
      const matchevents = Array.isArray(match?.data?.eventstats) ? match.data.eventstats : null;
      //console.log(event);
      const matchtimeline = Array.isArray(mtimeline?.data?.timeline) ? mtimeline.data.timeline: null;
      if (!event) return res.status(404).json({ error: 'TSDB event not found' });
      if (!matchevents) return res.status(404).json({ error: 'TSDB event not found' });
      console.log(matchtimeline);
      const filteredtimeline = [];
      if(matchtimeline != null){
        for (let i = 0; i<5; i++){
          if(matchtimeline[i].strTimeline === "Goal" || matchtimeline[i].strTimeline === "card"){
            filteredtimeline.push(matchtimeline[i]);
            filteredtimeline[filteredtimeline.length - 1].strTimelineDetail = filteredtimeline[filteredtimeline.length - 1].strTimelineDetail.replace("Normal Goal", "Open Play");
          }
        }
      }

      payload = {
        id,
        venue: event.strVenue ?? null,
        highlights: event.strVideo,
        attendance: event.intAttendance ?? null,
        hTotalShots: matchevents[2].intHome ?? null,
        aTotalShots: matchevents[2].intAway ?? null,
        hShotsOnTarget: matchevents[0].intHome ?? null,
        aShotsOnTarget: matchevents[0].intAway ?? null,
        keyevents: filteredtimeline

      };





      return res.json(payload);
    }



  }
  catch (err){
    console.error('[details error]', {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
      url: err?.config?.url,
      params: err?.config?.params,
      stack: err?.stack,
    });

  }

}


)

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))


