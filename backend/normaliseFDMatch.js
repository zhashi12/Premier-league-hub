// normaliseFDMatch.js

function normalizeFDMatch(m) {
  const homeName = m?.homeTeam?.name || '';
  const awayName = m?.awayTeam?.name || '';

  return {
    id: `fd-${m.id}`,
    utcDate: m.utcDate,
    status: m.status,
    homeTeam: {
      id: m?.homeTeam?.id ?? null,
      name: homeName,
      crest: m?.homeTeam?.crest || null,
    },
    awayTeam: {
      id: m?.awayTeam?.id ?? null,
      name: awayName,
      crest: m?.awayTeam?.crest || null,
    },
    score: {
      fullTime: {
        home: m?.score?.fullTime?.home ?? null,
        away: m?.score?.fullTime?.away ?? null,
      },
    },
  };
}


module.exports = normalizeFDMatch;
