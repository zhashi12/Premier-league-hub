const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { set } = require('mongoose');
const app = express();

app.use(cors());

app.get('/api/matches', async (req, res) => {
  try {
    const responseUpcoming = await axios.get('https://api.football-data.org/v4/competitions/PL/matches', {
      headers: {
        'X-Auth-Token': '7d252203991e4fa48ea51dd3231ca293'
      }
    });

    const currentDate = new Date();
    const dateTo = new Date().toISOString().split('T')[0];

    const start = new Date();
    start.setDate(currentDate.getDate() - 84);
    const dateFrom = start.toISOString().split('T')[0];

    const upcomingMatches = responseUpcoming.data.matches
      .filter(match => new Date(match.utcDate) > currentDate) 
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))  
      .slice(0, 10); 

    const responsePast = await axios.get('https://api.football-data.org/v4/competitions/PL/matches', {
      headers: {
        'X-Auth-Token': '7d252203991e4fa48ea51dd3231ca293'
      },
      params: {
        dateFrom: dateFrom,  
        dateTo: dateTo, //make permanent refresh solution to this 
        //include currently occurring games (with minutes)
        //add in red cards, goalscorers and minute they scores
      }
    });

    const ONGOING = new Set(["IN_PLAY","PAUSED",]);
    const recentMatches = responsePast.data.matches
      .filter(m => 
        (m.status === "FINISHED" || ONGOING.has(m.status)) && new Date(m.utcDate) <= currentDate
      )
      .sort((a,b) => new Date(b.utcDate) - new Date(a.utcDate))
      .slice(0,10);

    const pastMatches = responsePast.data.matches
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))  
      .slice(0, 10);  


    res.json({ upcomingMatches, recentMatches});

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))