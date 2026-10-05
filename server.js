const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const ROOT = __dirname;
const DB_FILE = process.env.SCORES_FILE || path.join(ROOT, 'scores.json');
let pgPool = null;
let dbReady = Promise.resolve(false);

function cleanName(n){
  return String(n || 'PLAYER').replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 16) || 'PLAYER';
}
function cleanPlayerId(v){
  return String(v || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}
function scoreNumber(v, max){
  return Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
}
function betterThan(oldBest, candidate){
  if(!oldBest) return true;
  return candidate.score > oldBest.score ||
    (candidate.score === oldBest.score && (candidate.stage > oldBest.stage ||
      (candidate.stage === oldBest.stage && candidate.kills > oldBest.kills)));
}
function sortScores(a){
  return a.sort((x,y) => y.score - x.score || y.stage - x.stage || y.kills - x.kills || (x.time || 0) - (y.time || 0));
}
function rankedRows(rows){
  return rows.map((row, i) => ({...row, rank:i+1}));
}
function normalizeScore(raw){
  return {
    playerId: cleanPlayerId(raw.playerId || raw.id) || ('legacy_' + String(raw.id || crypto.randomUUID())),
    name: cleanName(raw.name),
    score: scoreNumber(raw.score, 100000000),
    stage: scoreNumber(raw.stage, 10000),
    kills: scoreNumber(raw.kills, 1000000),
    time: Number(raw.time) || Date.now(),
    games: Math.max(1, scoreNumber(raw.games, 1000000))
  };
}
function readFileScores(){
  try{
    const a = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return Array.isArray(a) ? a.map(normalizeScore) : [];
  }catch{return []}
}
function saveFileScores(a){
  try{ fs.writeFileSync(DB_FILE, JSON.stringify(sortScores(a).slice(0, 1000), null, 2)); }catch(e){ console.error('scores.json 저장 실패:', e.message); }
}

async function initPostgres(){
  if(!process.env.DATABASE_URL){
    if(process.env.NODE_ENV === 'production' && process.env.REQUIRE_DATABASE !== 'false'){
      console.error('❌ DATABASE_URL이 없습니다. Render에서는 영구 랭킹 DB가 필수입니다.');
    }
    return false;
  }
  try{
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS lucky_scores (
        player_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        score BIGINT NOT NULL,
        stage INTEGER NOT NULL,
        kills INTEGER NOT NULL,
        time BIGINT NOT NULL,
        games INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // v24: 기존 JSON 랭킹이 남아 있으면 DB가 비어 있을 때 한 번만 이전합니다.
    const count = await pgPool.query('SELECT COUNT(*)::int AS n FROM lucky_scores');
    if(Number(count.rows[0]?.n || 0) === 0){
      const legacy = readFileScores();
      for(const row of legacy){
        await pgPool.query(
          `INSERT INTO lucky_scores(player_id,name,score,stage,kills,time,games,updated_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT (player_id) DO NOTHING`,
          [row.playerId,row.name,row.score,row.stage,row.kills,row.time,row.games]
        );
      }
      if(legacy.length) console.log(`🏆 기존 scores.json 기록 ${legacy.length}개를 PostgreSQL로 이전했습니다.`);
    }
    console.log('🏆 PostgreSQL 영구 랭킹 DB 연결 완료');
    return true;
  }catch(e){
    console.error('⚠️ PostgreSQL 연결 실패:', e.message);
    pgPool = null;
    return false;
  }
}
dbReady = initPostgres();

async function getRanking(playerId=''){
  await dbReady;
  if(pgPool){
    const { rows } = await pgPool.query(`SELECT player_id AS "playerId", name, score::text AS score, stage, kills, time, games FROM lucky_scores ORDER BY score DESC, stage DESC, kills DESC, time ASC`);
    const ranking = rows.map(normalizeScore);
    const ranked = rankedRows(ranking);
    const idx = cleanPlayerId(playerId) ? ranking.findIndex(x => x.playerId === cleanPlayerId(playerId)) : -1;
    const mine = idx >= 0 ? ranking[idx] : null;
    return { ranking: ranked.slice(0,100), totalPlayers: ranking.length, myRank: idx >= 0 ? idx + 1 : null, myBest: mine ? {name:mine.name,score:mine.score,stage:mine.stage,kills:mine.kills,games:mine.games,time:mine.time} : null, updatedAt: Date.now() };
  }
  const ranking = sortScores(readFileScores());
  const ranked = rankedRows(ranking);
  const id = cleanPlayerId(playerId);
  const idx = id ? ranking.findIndex(x => x.playerId === id) : -1;
  const mine = idx >= 0 ? ranking[idx] : null;
  return { ranking: ranked.slice(0,100), totalPlayers: ranking.length, myRank: idx >= 0 ? idx + 1 : null, myBest: mine ? {name:mine.name,score:mine.score,stage:mine.stage,kills:mine.kills,games:mine.games,time:mine.time} : null, updatedAt: Date.now() };
}

async function submitScore(x){
  await dbReady;
  if(process.env.NODE_ENV === 'production' && !pgPool && process.env.REQUIRE_DATABASE !== 'false'){
    throw new Error('영구 랭킹 DB가 연결되지 않았습니다. Render의 DATABASE_URL을 확인해주세요.');
  }
  const playerId = cleanPlayerId(x.playerId) || crypto.randomUUID();
  const candidate = {
    playerId,
    name: cleanName(x.name),
    score: scoreNumber(x.score, 100000000),
    stage: scoreNumber(x.stage, 10000),
    kills: scoreNumber(x.kills, 1000000),
    time: Date.now(),
    games: 1
  };
  if(candidate.score < 0 || candidate.stage < 0 || candidate.kills < 0) throw new Error('invalid score');

  let old = null;
  if(pgPool){
    const q = await pgPool.query(`SELECT player_id AS "playerId", name, score::text AS score, stage, kills, time, games FROM lucky_scores WHERE player_id=$1`, [playerId]);
    old = q.rows[0] ? normalizeScore(q.rows[0]) : null;
    const isNewBest = betterThan(old, candidate);
    if(!old){
      await pgPool.query(`INSERT INTO lucky_scores(player_id,name,score,stage,kills,time,games) VALUES($1,$2,$3,$4,$5,$6,1,NOW())`, [playerId,candidate.name,candidate.score,candidate.stage,candidate.kills,candidate.time]);
    }else if(isNewBest){
      await pgPool.query(`UPDATE lucky_scores SET name=$2,score=$3,stage=$4,kills=$5,time=$6,games=$7,updated_at=NOW() WHERE player_id=$1`, [playerId,candidate.name,candidate.score,candidate.stage,candidate.kills,candidate.time,old.games+1]);
    }else{
      await pgPool.query(`UPDATE lucky_scores SET name=$2,games=$3,updated_at=NOW() WHERE player_id=$1`, [playerId,candidate.name,old.games+1]);
    }
    const d = await getRanking(playerId);
    return { ok:true, rank:d.myRank, isNewBest, previousBest:old ? {score:old.score,stage:old.stage,kills:old.kills}:null, player:d.myBest, ranking:d.ranking, totalPlayers:d.totalPlayers };
  }

  const a = readFileScores();
  old = a.find(s => s.playerId === playerId) || null;
  const isNewBest = betterThan(old, candidate);
  if(!old){ a.push(candidate); }
  else if(isNewBest){
    const i = a.findIndex(s => s.playerId === playerId);
    a[i] = {...candidate, games: old.games + 1};
  }else{
    old.name = candidate.name;
    old.games = old.games + 1;
  }
  saveFileScores(a);
  const d = await getRanking(playerId);
  return { ok:true, rank:d.myRank, isNewBest, previousBest:old ? {score:old.score,stage:old.stage,kills:old.kills}:null, player:d.myBest, ranking:d.ranking, totalPlayers:d.totalPlayers };
}

function json(res, code, data){
  res.writeHead(code, {
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':'*',
    'Cache-Control':'no-store',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  });
  res.end(JSON.stringify(data));
}
function body(req){
  return new Promise((resolve,reject)=>{
    let s='';
    req.on('data', x=>{
      s += x;
      if(s.length > 100000){ req.destroy(); reject(new Error('body too large')); }
    });
    req.on('end',()=>{ try{ resolve(JSON.parse(s || '{}')); }catch(e){ reject(e); } });
    req.on('error',reject);
  });
}
function serve(res,file){
  const ext = path.extname(file);
  const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
  fs.readFile(file,(e,d)=>{
    if(e){ res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{'Content-Type':types[ext] || 'text/plain; charset=utf-8','Cache-Control':'no-store'});
    res.end(d);
  });
}

const handler = async(req,res)=>{
  let u;
  try{ u = new URL(req.url, 'http://localhost'); }catch{ res.writeHead(400); return res.end('Bad Request'); }
  if(req.method === 'OPTIONS') return json(res,204,{});

  if(req.method === 'GET' && u.pathname === '/health'){
    await dbReady;
    return json(res,200,{ok:true,service:'LUCKY DEFENSE',database:pgPool?'postgres':'json',persistentRanking:!!pgPool,warning:(!pgPool&&process.env.NODE_ENV==='production')?'DATABASE_URL missing or DB unavailable: ranking will not survive redeploys.':'',time:Date.now()});
  }
  if(req.method === 'GET' && u.pathname === '/api/ranking'){
    try{ return json(res,200,await getRanking(u.searchParams.get('playerId') || '')); }
    catch(e){ return json(res,500,{error:'ranking unavailable'}); }
  }
  if(req.method === 'POST' && u.pathname === '/api/score'){
    try{
      const payload = await body(req);
      if(!payload || typeof payload !== 'object' || Array.isArray(payload)) return json(res,422,{ok:false,error:'invalid JSON payload'});
      return json(res,200,await submitScore(payload));
    }catch(e){
      const msg=e?.message || 'score submission failed';
      console.error('❌ /api/score failed:',msg);
      const code = /영구 랭킹 DB|PostgreSQL|DATABASE_URL|ECONN|timeout|connection/i.test(msg) ? 503 : (/invalid JSON|invalid score/i.test(msg) ? 422 : 500);
      return json(res,code,{ok:false,error:msg});
    }
  }

  let rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.replace(/^\//,''));
  const file = path.normalize(path.join(ROOT, rel));
  if(!file.startsWith(ROOT)) return res.writeHead(403).end();
  return serve(res,file);
};

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(handler);
server.on('error',err=>{ console.error('❌ 서버 오류:', err.message || err); process.exit(1); });
server.listen(PORT, HOST, ()=>{
  const localUrl = `http://localhost:${PORT}`;
  console.log(`\n🎮 LUCKY DEFENSE listening on ${HOST}:${PORT}`);
  console.log(`🏠 Local: ${localUrl}`);
  console.log(`🏆 Ranking: ${pgPool ? 'PostgreSQL (persistent)' : 'scores.json fallback (NOT persistent on redeploy)'}`);
  console.log('🌐 Production HTTPS is handled by the hosting platform.\n');
  if(!process.env.RENDER && !process.env.NO_BROWSER){
    setTimeout(()=>{ try{ if(process.platform==='win32') exec(`start "" "${localUrl}"`); }catch{} },350);
  }
});
