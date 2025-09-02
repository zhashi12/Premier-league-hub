"use client";
import React, {useState, useEffect} from "react";
export default function MatchList({ matches, variant }) {
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({}); 
  const [loadingId, setLoadingId] = useState(null);
  const base = process.env.NEXT_PUBLIC_API_BASE;
  //const base ="http://localhost:3001/"

  const v = (variant || '').toLowerCase();
  if (!Array.isArray(matches) || matches.length === 0) {
    const message = v ==="live" ? 'No live matches right now.' : v === "finished" ? 'No matches available.': "No upcoming matches";
    return (
      <div className="w-full py-10 text-center">  
        <strong>{message}</strong>
      </div>
    );
  }



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
  }, [openId, details, base]);




  return (
    <ul>
      {matches.map((match, idx) => {
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
                    <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 9999, background: '#09fd4eff', border: '1px solid #e5e7eb' }}>
                      FT
                    </span>
                  </strong>
                ) : (
                  // scheduled
                  <span>{match?.utcDate ? new Date(match.utcDate).toLocaleString() : 'TBD'}</span>
                )}
                <b>&nbsp;{away.name || "away"}</b>
                <img src = {match.awayTeam.crest} alt = "Away crest" width = "50" height = "20"></img>
              
              </button>
              {variant === "finished" && openId === id && (
              <div className="matchDetails">
                {loadingId === id && <div>Loading…</div>}
                {!loadingId && details[id]?.__error && <div>Failed to load details.</div>}
                {!loadingId && details[id] && !details[id].__error && (
                  <>
                    <div className="detailRow">
                      <span>Decisive Early Moments</span>
                      <div className="flex flex-col gap-1">
                        {details[id].keyevents && details[id].keyevents.length > 0 ? (
                          details[id].keyevents.map((ev, index) => (
                            <div
                              key={index}
                              className={`flex ${
                                ev.strHome === "Yes" ? "justify-start" : "justify-end"
                              }`}
                            >
                              <div className="bg-gray-100 px-2 py-1 rounded text-sm">
                                <strong>{ev.strTimeline}</strong>
                                {ev.strTimelineDetail && ` (${ev.strTimelineDetail})`} –{" "}
                                {ev.strPlayer} {ev.intTime}’
                              </div>
                            </div>
                          ))
                        ) : (
                          <span>TBD</span>
                        )}
                      </div>
                    </div>

                    <div className="detailRow">
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