/* ETA on reloaded multi-day tournament: source-level regression guard.
 * Exercises the exact elapsed calculation extracted from the validation HTML,
 * without modifying user backups, startedAt or elapsedMs. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html','utf8');
const computation=/const start=Number\(m\.startedAt\).*?const elapsed=.*?;/g;
const snippets=[...html.matchAll(computation)].map(x=>x[0]);
assert.equal(snippets.length,2,'Both ETA projections must use the guarded clock calculation.');
const calculate=snippets.map(source=>new Function('m','now',source+'return elapsed;'));
const day=24*60*60*1000,now=Date.parse('2026-11-17T12:00:00Z');
for(const elapsed of calculate){
 assert.equal(elapsed({startedAt:now-5*day,elapsedMs:120000},now),2,'Downtime after prior sessions should not count as match time.');
 assert.equal(elapsed({startedAt:now-5*60000,elapsedMs:120000},now),7,'Active same-day timer should keep ticking.');
 assert.equal(elapsed({startedAt:null,elapsedMs:120000},now),2,'Paused match retains known elapsed duration.');
 assert.equal(elapsed({startedAt:now+60000,elapsedMs:120000},now),2,'Future timestamp must never count negative elapsed.');
 assert.equal(elapsed({startedAt:now-5*day,elapsedMs:0},now),0,'Stale timer with no previous elapsed starts at zero for ETA.');
}
const pauseSource=html.match(/function pauseMatchClock\(m\)\{[^}]+\}/)?.[0];
assert(pauseSource,'Official pause/restart mechanism must remain present.');
const doPause=new Function('m','Date',pauseSource+';pauseMatchClock(m);return m;');
for(const [stamp,expected] of [
 [now-5*day,120000],
 [now-5*60000,420000],
 [now+60000,120000],
 [null,120000]
]){
 const score={a:5,b:3},sets=[{a:5,b:3}];
 const data={startedAt:stamp,elapsedMs:120000,score,sets};
 const result=doPause(data,{now:()=>now});
 assert.equal(result.elapsedMs,expected,'Unexpected accumulated clock after pause: '+String(stamp));
 assert.equal(result.startedAt,null,'Pausing must clear the running timestamp.');
 assert.deepEqual(result.sets,[{a:5,b:3}],'Pausing changed match sets.');
 assert.deepEqual(result.score,{a:5,b:3},'Pausing changed match score.');
}
console.log('OK : un match ancien remis en attente ne cumule pas les jours écoulés ; manche 5-3 intacte.');
console.log('OK : les deux projections excluent les jours inter-seances, sans mutation des horodatages ni des scores.');
