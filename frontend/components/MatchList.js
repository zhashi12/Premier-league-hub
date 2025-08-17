export default function MatchList({ matches, isPastGames }) {
  if (!matches || matches.length === 0) {
    return <p>No matches available</p>;
  }

  return (
    <ul>
      {matches.map(match => (
        <li key={match.id}>
          <img src = {match.homeTeam.crest} alt = "Home crest" width = "50" height = "20"></img>
          <b>{match.homeTeam.name}</b>
          {isPastGames && match.score && match.score.fullTime ? (

                  `${match.score.fullTime.home} - ${match.score.fullTime.away} `

          ) : (
            ' vs '
          )}
          <b>&nbsp;{match.awayTeam.name}</b>
          <img src = {match.awayTeam.crest} alt = "Away crest" width = "50" height = "20"></img>
          
    
        </li>
      ))}
    </ul>
  );
}