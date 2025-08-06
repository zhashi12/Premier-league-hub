export default function MatchList({ matches, isPastGames }) {
  if (!matches || matches.length === 0) {
    return <p>No matches available</p>;
  }

  return (
    <ul>
      {matches.map(match => (
        <li key={match.id}>

          <b>{match.homeTeam.name}</b>
          {isPastGames && match.score && match.score.fullTime ? (

            ` ${match.score.fullTime.home} - ${match.score.fullTime.away} `
          ) : (
            ' vs '
          )}
          <b>&nbsp;{match.awayTeam.name}</b>
          
    
          <span className="match-date">&nbsp;({new Date(match.utcDate).toLocaleString()})</span>
        </li>
      ))}
    </ul>
  );
}