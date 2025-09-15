"use client";
import React, {useState, useEffect} from "react";
export default function MatchList({ matches, variant }) {
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({}); 
  const [loadingId, setLoadingId] = useState(null);
  const base = process.env.NEXT_PUBLIC_API_BASE;
  //const base ="http://localhost:3001/"



    useEffect(() => {
    if (!openId || details[openId]) return;

    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingId(openId);
        const res = await fetch(`${base}api/matches/${openId}/details`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setDetails(prev => ({ ...prev, [openId]: data }));
      } catch (e) {
        if (e.name !== "AbortError") {
          setDetails(prev => ({ ...prev, [openId]: { __error: true } }));
        }
      } finally {
        setLoadingId(null);
      }
    })();

    return () => ctrl.abort();
  }, [openId, details]);

  const v = (variant || '').toLowerCase();
  if ( !Array.isArray(matches) || matches.length === 0) {
    const message = v ==="live" ? 'No live matches right now.' : v === "finished" ? 'No matches available.' : v === "scheduled" ? "No upcoming matches" : "Table is unavailable";
    return (
      <div className="w-full py-10 text-center">  
        <strong>{message}</strong>
      </div>
    );
  }







  return (
    <ul>
      {matches.map((match, idx) => {
        if (variant === "table") {
          if (idx !== 0) return null;
          return (
          <li key="standings" className="stand">
            <div className="standings">
              {/* Header (once) */}
              <div className="tableHeader gridRow">
                <span className="col-pos">Pos</span>
                <span className="col-team">Team</span>
                <span className="col-played">P</span>
                <span className="col-gd">GD</span>
                <span className="col-pts">Pts</span>
              </div>

              {/* Rows */}
              <ul className="tableList">
                {matches.map((row, idx) => {
                  const team = row?.team ?? {};
                  const id   = team?.id ?? `t-${idx}`;
                  return (
                    <li key={id} className="tableRow gridRow">
                      <span className="pos">{row.position}</span>
                      <span className="team">

                        {team?.name ?? "Unknown"}
                      </span>
                      <span className="played">{row?.playedGames ?? 0}</span>
                      <span className="gd">{row?.goalDifference ?? 0}</span>
                      <span className="points">{row?.points ?? 0}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            </li>
          );
        }
        const id = match.id ?? `m-${idx}`;
        const home   = match?.homeTeam ?? {};
        const away   = match?.awayTeam ?? {};
        const ft     = match?.score?.fullTime ?? null;                   
        const minute = typeof match?.minute === 'number' ? match.minute : null;


        const hLive = typeof ft?.home === 'number' ? ft.home : '-';
        const aLive = typeof ft?.away === 'number' ? ft.away : '-';
        const hFin  = typeof ft?.home === 'number' ? ft.home : 0;
        const aFin  = typeof ft?.away === 'number' ? ft.away : 0;


        return(
            <li key={id} >
              <button 
              className="rowButton"
              onClick={() => setOpenId(openId === id ? null : id)}
              >
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
                    <span className="fullTime">
                      FT
                    </span>
                  </strong>
                ) : (
                  // scheduled
                  <span>{match?.utcDate ? new Date(match.utcDate).toLocaleString() : 'TBD'}</span>
                )}
                <b>&nbsp;{away.name || "away"}</b>
                <img src = {match?.awayTeam?.crest } alt = "Away crest" width = "50" height = "20"></img>
              
              </button>

          




              {variant === "finished" && openId === id && (
              <div className="matchDetails">
                {loadingId === id && <div>Loading…</div>}
                {!loadingId && details[id]?.__error && <div>Failed to load details.</div>}
                {!loadingId && details[id] && !details[id].__error && (
                  <>
                    <div className="detail">
                      <div className="flex flex-col gap-1">
                        {details[id].keyevents && details[id].keyevents.length > 0 ? (
                          <>
                          <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold px-3 py-1 rounded-full shadow">
                            ⚽ Decisive Early Moments
                          </span>

                          {details[id].keyevents.map((ev, index) => (
                            <div
                              key={index}
                              className={`flex ${
                                ev.strHome === "Yes" ? "justify-start ml-[50px]" : "justify-end mr-[50px]"
                              }`}
                            >
                              <div className="matchTimeline">
                                <strong>{ev.strTimeline}</strong>
                                {` (${ev.strTimelineDetail})`} –{" "}
                                {ev.strPlayer} {ev.intTime}’
                              </div>
                            </div>
                            
                            ))}
                            </>
                        ) : (
                          <span></span>
                        )}
                      </div>
                    </div>
                    <div className = "shotUI">
                      <div className = "left"> {details[id].hTotalShots}</div>
                      <div className = "center">Total Shots</div>
                      <div className = "right">{details[id].aTotalShots}</div>

                    </div>
                    <div className="shotUI">
                      <div className = "left"> {details[id].hShotsOnTarget}</div>
                      <div className = "center">Shots on Target</div>
                      <div className = "right">{details[id].aShotsOnTarget}</div>
                    </div>

                    <div className="detailRow">
                      <span></span>
                      <span>Venue:</span>
                      <strong>{details[id].venue ?? "TBD"}</strong>
                    </div>
                    <div className="detailRow">
                      <span>Highlights: </span>
                      {<strong>{details[id].highlights ?? "Highlights have not yet been released"}</strong>}
                    </div>
                    <div className="detailRow">
                      <span>Attendance figures: </span>
                      {<strong>{details[id].attendance ?? "Unconfirmed"}</strong>}
                    </div>
                  </>
                )}
              </div>
            )}
            </li>
          )})}
    </ul>
  );
}
//mm