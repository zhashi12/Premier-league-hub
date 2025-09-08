'use client';
import { useState, useEffect } from 'react';  
import axios from 'axios';
import MatchList from '../components/MatchList';
import '../styles/globals.css';

export default function Home() {
  
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [pastMatches, setPastMatches] = useState([]);
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);

  //const base = process.env.NEXT_PUBLIC_API_BASE;
  const base ="http://localhost:3001/"


  useEffect(() => {
    axios.get(`${base}api/matches`) 
      .then(response => {
        console.log('Matches fetched:', response.data);
        setUpcomingMatches(response.data.upcomingMatches);
        setRecentMatches(response.data.recentMatches);  
        setPastMatches(response.data.pastMatches);
        setLoading(false);
        setTable(response.data.table);
      })
      .catch(error => console.error('Error fetching matches:', error));
  }, []);

  return (
    <div className = "two-col">
      <div className='table'>
        <h2 style={{margin: '40px'}}>Table</h2>
        <MatchList matches={table} variant={"table"}></MatchList>
      </div>
      <div className = "centerContent">
      {loading ? <p>Loading matches...</p> : (
        <>
        <div style= {{marginBottom: '40px'}}>
          <h2 style={{ marginBottom: '20px' }}>Live Games</h2>
          <MatchList matches={recentMatches} variant={"live"} />
          </div>
          <div >
            <h2 style={{margin: '40px'}}>Past 10 results</h2>
            <MatchList matches={pastMatches} variant={"finished"}></MatchList>
          </div>



          <div>
          <h2 style={{margin: ' 40px' }}>Next 10 Games</h2>
          <MatchList matches={upcomingMatches} variant={"scheduled"} /> 
          </div>
        </>
      )}
      </div>
    </div>
  );
}
