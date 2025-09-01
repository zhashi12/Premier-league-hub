"use client";
export default function MatchList({ matches, variant }) {
  const v = (variant || '').toLowerCase();
  if (!Array.isArray(matches) || matches.length === 0) {
    const message = v ==="live" ? 'No live matches right now.' : v === "finished" ? 'No matches available.': "No upcoming matches";
    return (
      <div className="w-full py-10 text-center">  
        <strong>{message}</strong>
      </div>
    );
  }



  return (
    <ul>
      {matches.map((match, idx) => {
        const id = match?.id ?? `m-${idx}`;
        const home   = match?.homeTeam ?? {};
        const away   = match?.awayTeam ?? {};
        const ft     = match?.score?.fullTime ?? null;                       // {home, away} | null
        const minute = typeof match?.minute === 'number' ? match.minute : null;

        // sane defaults per stage
        const hLive = typeof ft?.home === 'number' ? ft.home : '-';
        const aLive = typeof ft?.away === 'number' ? ft.away : '-';
        const hFin  = typeof ft?.home === 'number' ? ft.home : 0;
        const aFin  = typeof ft?.away === 'number' ? ft.away : 0;


        return(
            <li key={match.id ?? `m-${idx}`}>
              <img src = {home.crest} alt = "Home crest" width = "50" height = "20"></img>
              <b>{home.name || "home"}</b>
              {variant === "live" ? (
                <strong>
                {hLive} - {aLive}
                <span style={{ marginLeft: 8 }}>{minute != null ? `${minute}’` : 'LIVE'}</span>
                </strong>
              ) : variant === "finished" ? (
                <strong>
                  {hFin} - {aFin}
                  <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 9999, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                    FT
                  </span>
                </strong>
              ) : (
                // scheduled
                <span>{match?.utcDate ? new Date(match.utcDate).toLocaleString() : 'TBD'}</span>
              )}
              <b>&nbsp;{away.name || "away"}</b>
              <img src = {match.awayTeam.crest} alt = "Away crest" width = "50" height = "20"></img>
              
        
            </li>
          )})}
    </ul>
  );
}