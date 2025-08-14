'use client';
import { useState, useEffect } from 'react';  
import axios from 'axios';
import MatchList from '../components/MatchList';
import '../styles/globals.css';

export default function Home() {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:3001/api/matches') 
      .then(response => {
        console.log('Matches fetched:', response.data);
        setUpcomingMatches(response.data.upcomingMatches);
        setRecentMatches(response.data.recentMatches);  
        setLoading(false);
      })
      .catch(error => console.error('Error fetching matches:', error));
  }, []);

  return (
    <div>

      {loading ? <p>Loading matches...</p> : (
        <>
        <div style= {{marginBottom: '40px'}}>
          <h2 style={{ marginBottom: '20px' }}>Past 10 Games</h2>
          <MatchList matches={recentMatches} isPastGames={true} />
</div>
<div>
          <h2 style={{margin: '20px' }}>Next 10 Games</h2>
          <MatchList matches={upcomingMatches} isPastGames={false} /> 
          </div>
        </>
      )}
    </div>
  );
}