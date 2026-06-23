export async function onRequest(context) {
  const now = new Date();

  const matches = [
    {"group":"Group Stage — June 20","id":"match_1","team1":"Netherlands","team1Flag":"https://flagcdn.com/w160/nl.png","team2":"Sweden","team2Flag":"https://flagcdn.com/w160/se.png","time":"2026-06-20T23:00:00+06:00"},
    {"group":"Group Stage — June 21","id":"match_2","team1":"Germany","team1Flag":"https://flagcdn.com/w160/de.png","team2":"Ivory Coast","team2Flag":"https://flagcdn.com/w160/ci.png","time":"2026-06-21T02:00:00+06:00"},
    {"group":"Group Stage — June 21","id":"match_3","team1":"Ecuador","team1Flag":"https://flagcdn.com/w160/ec.png","team2":"Curaçao","team2Flag":"https://flagcdn.com/w160/cw.png","time":"2026-06-21T06:00:00+06:00"},
    {"group":"Group Stage — June 21","id":"match_4","team1":"Tunisia","team1Flag":"https://flagcdn.com/w160/tn.png","team2":"Japan","team2Flag":"https://flagcdn.com/w160/jp.png","time":"2026-06-21T10:00:00+06:00"},
    {"group":"Group Stage — June 21","id":"match_5","team1":"Spain","team1Flag":"https://flagcdn.com/w160/es.png","team2":"Saudi Arabia","team2Flag":"https://flagcdn.com/w160/sa.png","time":"2026-06-21T22:00:00+06:00"},
    {"group":"Group Stage — June 22","id":"match_6","team1":"Belgium","team1Flag":"https://flagcdn.com/w160/be.png","team2":"Iran","team2Flag":"https://flagcdn.com/w160/ir.png","time":"2026-06-22T01:00:00+06:00"},
    {"group":"Group Stage — June 22","id":"match_7","team1":"Uruguay","team1Flag":"https://flagcdn.com/w160/uy.png","team2":"Cape Verde","team2Flag":"https://flagcdn.com/w160/cv.png","time":"2026-06-22T04:00:00+06:00"},
    {"group":"Group Stage — June 22","id":"match_8","team1":"New Zealand","team1Flag":"https://flagcdn.com/w160/nz.png","team2":"Egypt","team2Flag":"https://flagcdn.com/w160/eg.png","time":"2026-06-22T07:00:00+06:00"},
    {"group":"Group Stage — June 22","id":"match_9","team1":"Argentina","team1Flag":"https://flagcdn.com/w160/ar.png","team2":"Austria","team2Flag":"https://flagcdn.com/w160/at.png","time":"2026-06-22T23:00:00+06:00"},
    {"group":"Group Stage — June 23","id":"match_10","team1":"France","team1Flag":"https://flagcdn.com/w160/fr.png","team2":"Iraq","team2Flag":"https://flagcdn.com/w160/iq.png","time":"2026-06-23T03:00:00+06:00"},
    {"group":"Group Stage — June 23","id":"match_11","team1":"Norway","team1Flag":"https://flagcdn.com/w160/no.png","team2":"Senegal","team2Flag":"https://flagcdn.com/w160/sn.png","time":"2026-06-23T06:00:00+06:00"},
    {"group":"Group Stage — June 23","id":"match_12","team1":"Jordan","team1Flag":"https://flagcdn.com/w160/jo.png","team2":"Algeria","team2Flag":"https://flagcdn.com/w160/dz.png","time":"2026-06-23T09:00:00+06:00"},
    {"group":"Group Stage — June 23","id":"match_13","team1":"Portugal","team1Flag":"https://flagcdn.com/w160/pt.png","team2":"Uzbekistan","team2Flag":"https://flagcdn.com/w160/uz.png","time":"2026-06-23T23:00:00+06:00"},
    {"group":"Group Stage — June 24","id":"match_14","team1":"England","team1Flag":"https://flagcdn.com/w160/gb.png","team2":"Ghana","team2Flag":"https://flagcdn.com/w160/gh.png","time":"2026-06-24T02:00:00+06:00"},
    {"group":"Group Stage — June 24","id":"match_15","team1":"Panama","team1Flag":"https://flagcdn.com/w160/pa.png","team2":"Croatia","team2Flag":"https://flagcdn.com/w160/hr.png","time":"2026-06-24T05:00:00+06:00"},
    {"group":"Group Stage — June 24","id":"match_16","team1":"Colombia","team1Flag":"https://flagcdn.com/w160/co.png","team2":"DR Congo","team2Flag":"https://flagcdn.com/w160/cd.png","time":"2026-06-24T08:00:00+06:00"},
    {"group":"Group Stage — June 25","id":"match_17","team1":"Switzerland","team1Flag":"https://flagcdn.com/w160/ch.png","team2":"Canada","team2Flag":"https://flagcdn.com/w160/ca.png","time":"2026-06-25T01:00:00+06:00"},
    {"group":"Group Stage — June 25","id":"match_18","team1":"Bosnia & Herzegovina","team1Flag":"https://flagcdn.com/w160/ba.png","team2":"Qatar","team2Flag":"https://flagcdn.com/w160/qa.png","time":"2026-06-25T01:00:00+06:00"},
    {"group":"Group Stage — June 25","id":"match_19","team1":"Scotland","team1Flag":"https://flagcdn.com/w160/gb-sct.png","team2":"Brazil","team2Flag":"https://flagcdn.com/w160/br.png","time":"2026-06-25T04:00:00+06:00"},
    {"group":"Group Stage — June 25","id":"match_20","team1":"Morocco","team1Flag":"https://flagcdn.com/w160/ma.png","team2":"Haiti","team2Flag":"https://flagcdn.com/w160/ht.png","time":"2026-06-25T04:00:00+06:00"},
    {"group":"Group Stage — June 25","id":"match_21","team1":"Czechia","team1Flag":"https://flagcdn.com/w160/cz.png","team2":"Mexico","team2Flag":"https://flagcdn.com/w160/mx.png","time":"2026-06-25T07:00:00+06:00"},
    {"group":"Group Stage — June 25","id":"match_22","team1":"South Africa","team1Flag":"https://flagcdn.com/w160/za.png","team2":"South Korea","team2Flag":"https://flagcdn.com/w160/kr.png","time":"2026-06-25T07:00:00+06:00"},
    {"group":"Group Stage — June 26","id":"match_23","team1":"Ecuador","team1Flag":"https://flagcdn.com/w160/ec.png","team2":"Germany","team2Flag":"https://flagcdn.com/w160/de.png","time":"2026-06-26T02:00:00+06:00"},
    {"group":"Group Stage — June 26","id":"match_24","team1":"Curaçao","team1Flag":"https://flagcdn.com/w160/cw.png","team2":"Ivory Coast","team2Flag":"https://flagcdn.com/w160/ci.png","time":"2026-06-26T02:00:00+06:00"},
    {"group":"Group Stage — June 26","id":"match_25","team1":"Tunisia","team1Flag":"https://flagcdn.com/w160/tn.png","team2":"Netherlands","team2Flag":"https://flagcdn.com/w160/nl.png","time":"2026-06-26T05:00:00+06:00"},
    {"group":"Group Stage — June 26","id":"match_26","team1":"Japan","team1Flag":"https://flagcdn.com/w160/jp.png","team2":"Sweden","team2Flag":"https://flagcdn.com/w160/se.png","time":"2026-06-26T05:00:00+06:00"},
    {"group":"Group Stage — June 26","id":"match_27","team1":"Turkey","team1Flag":"https://flagcdn.com/w160/tr.png","team2":"United States","team2Flag":"https://flagcdn.com/w160/us.png","time":"2026-06-26T08:00:00+06:00"},
    {"group":"Group Stage — June 26","id":"match_28","team1":"Paraguay","team1Flag":"https://flagcdn.com/w160/py.png","team2":"Australia","team2Flag":"https://flagcdn.com/w160/au.png","time":"2026-06-26T08:00:00+06:00"},
    {"group":"Group Stage — June 27","id":"match_29","team1":"Norway","team1Flag":"https://flagcdn.com/w160/no.png","team2":"France","team2Flag":"https://flagcdn.com/w160/fr.png","time":"2026-06-27T01:00:00+06:00"},
    {"group":"Group Stage — June 27","id":"match_30","team1":"Senegal","team1Flag":"https://flagcdn.com/w160/sn.png","team2":"Iraq","team2Flag":"https://flagcdn.com/w160/iq.png animate-pulse","time":"2026-06-27T01:00:00+06:00"},
    {"group":"Group Stage — June 27","id":"match_31","team1":"Uruguay","team1Flag":"https://flagcdn.com/w160/uy.png","team2":"Spain","team2Flag":"https://flagcdn.com/w160/es.png","time":"2026-06-27T06:00:00+06:00"},
    {"group":"Group Stage — June 27","id":"match_32","team1":"Cape Verde","team1Flag":"https://flagcdn.com/w160/cv.png","team2":"Saudi Arabia","team2Flag":"https://flagcdn.com/w160/sa.png","time":"2026-06-27T06:00:00+06:00"},
    {"group":"Group Stage — June 27","id":"match_33","team1":"New Zealand","team1Flag":"https://flagcdn.com/w160/nz.png","team2":"Belgium","team2Flag":"https://flagcdn.com/w160/be.png","time":"2026-06-27T09:00:00+06:00"},
    {"group":"Group Stage — June 27","id":"match_34","team1":"Egypt","team1Flag":"https://flagcdn.com/w160/eg.png","team2":"Iran","team2Flag":"https://flagcdn.com/w160/ir.png","time":"2026-06-27T09:00:00+06:00"},
    {"group":"Group Stage — June 28","id":"match_35","team1":"Panama","team1Flag":"https://flagcdn.com/w160/pa.png","team2":"England","team2Flag":"https://flagcdn.com/w160/gb.png","time":"2026-06-28T03:00:00+06:00"},
    {"group":"Group Stage — June 28","id":"match_36","team1":"Croatia","team1Flag":"https://flagcdn.com/w160/hr.png","team2":"Ghana","team2Flag":"https://flagcdn.com/w160/gh.png","time":"2026-06-28T03:00:00+06:00"},
    {"group":"Group Stage — June 28","id":"match_37","team1":"Colombia","team1Flag":"https://flagcdn.com/w160/co.png","team2":"Portugal","team2Flag":"https://flagcdn.com/w160/pt.png","time":"2026-06-28T05:30:00+06:00"},
    {"group":"Group Stage — June 28","id":"match_38","team1":"DR Congo","team1Flag":"https://flagcdn.com/w160/cd.png","team2":"Uzbekistan","team2Flag":"https://flagcdn.com/w160/uz.png","time":"2026-06-28T05:30:00+06:00"},
    {"group":"Group Stage — June 28","id":"match_39","team1":"Jordan","team1Flag":"https://flagcdn.com/w160/jo.png","team2":"Argentina","team2Flag":"https://flagcdn.com/w160/ar.png","time":"2026-06-28T08:00:00+06:00"},
    {"group":"Group Stage — June 28","id":"match_40","team1":"Algeria","team1Flag":"https://flagcdn.com/w160/dz.png","team2":"Austria","team2Flag":"https://flagcdn.com/w160/at.png","time":"2026-06-28T08:00:00+06:00"}
  ];

  const updatedMatches = matches.map(m => {
    const matchDateStr = m.time.split('T')[0];
    if (matchDateStr === '2026-06-23') {
      if (m.id === 'match_12' || m.id === 'match_11' || m.id === 'match_13') {
        const forcedDate = new Date(now.getTime() - (30 * 60 * 1000));
        return {
          ...m,
          time: forcedDate.toISOString()
        };
      }
    }
    return m;
  });

  const news = [
    "FIFA Plus broadcasts World Football Cup Qualifiers live streams across Asian regions.",
    "CazéTV breaks stream records for the ongoing matches with massive live viewership in Brazil.",
    "T Sports live broadcasting channels schedule updated for the major International tournaments."
  ];

  return new Response(JSON.stringify({ matches: updatedMatches, news }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=600'
    }
  });
}
