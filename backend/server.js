const express = require('express');
const axios = require('axios');
const cors = require('cors');
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

    const upcomingMatches = responseUpcoming.data.matches
      .filter(match => new Date(match.utcDate) > currentDate) 
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))  
      .slice(0, 10); 

    const responsePast = await axios.get('https://api.football-data.org/v4/competitions/PL/matches', {
      headers: {
        'X-Auth-Token': '7d252203991e4fa48ea51dd3231ca293'
      },
      params: {
        status: 'FINISHED',  
        dateFrom: '2024-08-01',  
        dateTo: '2025-09-29' //make permanent refresh solution to this 
      }
    });

    const pastMatches = responsePast.data.matches
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))  
      .slice(0, 10);  


    res.json({ upcomingMatches, pastMatches });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))