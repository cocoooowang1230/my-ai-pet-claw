const { Client } = require('pg');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const DEFAULT_CONFIG = {
  currency: {
    RP: { cost: 300, threshold: 3000, weakChance: 0.1, strongChance: 1 },
    Credits: { cost: 10, threshold: 150, weakChance: 0.1, strongChance: 1 }
  },
  passCredits: 150,
  goldTicketSP: 500,
  shippingEnabled: true,
  registrationEnabled: true
};
const SEED_PRIZES = [
  ['MY AI PET Biscuit plush', 'plush', 8, 20, 500, 2500, 0, true, true],
  ['Partner pet charm', 'physical', 18, 30, 100, 500, 0, true, true],
  ['Golden Season ticket', 'ticket', 2, 50, 0, 0, 500, true, true],
  ['Mystery capsule', 'capsule', 12, 50, 150, 800, 0, true, true],
  ['Limited MY AI PET plush', 'physical', 1, 5, 1500, 6000, 0, false, true]
];

let initialized;
async function db() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) throw Object.assign(new Error('尚未設定 POSTGRES_URL。請先連結 PostgreSQL 資料庫。'), { status: 503 });
  const client = new Client({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } });
  await client.connect();
  if (!initialized) initialized = ensureSchema(client).catch(e => { initialized = null; throw e; });
  try { await initialized; } catch (e) { await client.end().catch(() => {}); throw e; }
  return client;
}
async function ensureSchema(c) {
  await c.query(`CREATE TABLE IF NOT EXISTS users(id text primary key,email text unique not null,password_hash text not null,role text not null default 'player',created_at timestamptz not null default now());
  CREATE TABLE IF NOT EXISTS sessions(token_hash text primary key,user_id text not null references users(id) on delete cascade,expires_at timestamptz not null);
  CREATE TABLE IF NOT EXISTS wallets(user_id text primary key references users(id) on delete cascade,sp bigint not null default 0,rp bigint not null default 0,credits bigint not null default 0,progress_rp bigint not null default 0,progress_credits bigint not null default 0);
  CREATE TABLE IF NOT EXISTS app_config(id integer primary key check(id=1),config jsonb not null);
  CREATE TABLE IF NOT EXISTS prizes(id text primary key,name text not null,kind text not null,weight integer not null default 1,stock integer not null default 0,recycle_rp bigint not null default 0,price_rp bigint not null default 0,sp_reward bigint not null default 0,pool_rp boolean not null default true,pool_credits boolean not null default true,active boolean not null default true,created_at timestamptz not null default now());
  CREATE TABLE IF NOT EXISTS plays(id text primary key,user_id text not null references users(id),currency text not null,cost bigint not null,success boolean not null,prize_id text references prizes(id),strong boolean not null,aligned boolean not null,created_at timestamptz not null default now());
  CREATE TABLE IF NOT EXISTS inventory(id text primary key,user_id text not null references users(id),prize_id text not null references prizes(id),play_id text not null references plays(id),status text not null default 'stored',created_at timestamptz not null default now());
  CREATE TABLE IF NOT EXISTS ledger(id text primary key,user_id text not null references users(id),currency text not null,delta bigint not null,reason text not null,reference_id text,created_at timestamptz not null default now());
  CREATE TABLE IF NOT EXISTS shipping_orders(id text primary key,user_id text not null references users(id),inventory_ids jsonb not null,recipient text not null,phone text not null,address text not null,status text not null default 'requested',created_at timestamptz not null default now());`);
  await c.query('CREATE INDEX IF NOT EXISTS plays_user_created_idx ON plays(user_id,created_at DESC); CREATE INDEX IF NOT EXISTS inventory_user_status_idx ON inventory(user_id,status); CREATE INDEX IF NOT EXISTS shipping_status_created_idx ON shipping_orders(status,created_at DESC);');
  await c.query('ALTER TABLE prizes ADD COLUMN IF NOT EXISTS price_rp bigint NOT NULL DEFAULT 0');
  await c.query('INSERT INTO app_config(id,config) VALUES(1,$1) ON CONFLICT(id) DO NOTHING', [JSON.stringify(DEFAULT_CONFIG)]);
  for (const [name, kind, weight, stock, recycle, price, sp, rp, credits] of SEED_PRIZES) {
    await c.query('INSERT INTO prizes(id,name,kind,weight,stock,recycle_rp,price_rp,sp_reward,pool_rp,pool_credits) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING', [slug(name), name, kind, weight, stock, recycle, price, sp, rp, credits]);
  }
}
function slug(s) { return 'seed-' + crypto.createHash('sha1').update(s).digest('hex').slice(0, 18); }
function send(res, status, body) { res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify(body)); }
function method(req, expected) { if (req.method !== expected) throw Object.assign(new Error('不支援此操作。'), { status: 405 }); }
function body(req) { return typeof req.body === 'object' && req.body ? req.body : {}; }
function cookie(req, name) { const row = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '=')); return row ? decodeURIComponent(row.slice(name.length + 1)) : ''; }
function cookieHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function userFor(req, c) {
  const token = cookie(req, 'petclaw_session'); if (!token) return null;
  const q = await c.query('SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [cookieHash(token)]);
  return q.rows[0] || null;
}
async function requireUser(req,c,admin=false) { const u=await userFor(req,c); if(!u) throw Object.assign(new Error('請先登入帳戶。'),{status:401}); if(admin&&u.role!=='admin') throw Object.assign(new Error('此頁僅限管理員。'),{status:403}); return u; }
function setSession(res, token) { res.setHeader('Set-Cookie', `petclaw_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`); }
function clearSession(res) { res.setHeader('Set-Cookie', 'petclaw_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'); }
async function passwordHash(password, salt=crypto.randomBytes(16).toString('hex')) { const hash=await scrypt(password,salt,64); return salt+':'+Buffer.from(hash).toString('hex'); }
async function checkPassword(password, stored) { const [salt,expected]=String(stored||'').split(':'); if(!salt||!expected)return false; const actual=Buffer.from(await scrypt(password,salt,64)).toString('hex'); return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected)); }
async function wallet(c,id,lock=false) { const q=await c.query(`SELECT * FROM wallets WHERE user_id=$1 ${lock?'FOR UPDATE':''}`,[id]); return q.rows[0]; }
async function publicState(c,u) {
 const [cfg,prizes,w,playCount,bag]=await Promise.all([
   c.query('SELECT config FROM app_config WHERE id=1'),
   c.query('SELECT id,name,kind,weight,stock,recycle_rp,price_rp,sp_reward,pool_rp,pool_credits FROM prizes WHERE active=true ORDER BY name'),
   u?wallet(c,u.id):Promise.resolve(null),
   u?c.query('SELECT count(*)::int AS count FROM plays WHERE user_id=$1',[u.id]):Promise.resolve({rows:[{count:0}]}),
   u?c.query("SELECT i.id,i.status,p.name,p.kind,p.recycle_rp FROM inventory i JOIN prizes p ON p.id=i.prize_id WHERE i.user_id=$1 AND i.status IN ('stored','shipping_requested') ORDER BY i.created_at DESC LIMIT 100",[u.id]):Promise.resolve({rows:[]})
 ]);
 const config=cfg.rows[0]?.config||DEFAULT_CONFIG;
 return { user:u?{id:u.id,email:u.email,role:u.role}:null, wallet:w?{sp:Number(w.sp),rp:Number(w.rp),credits:Number(w.credits),progress:{RP:Number(w.progress_rp),Credits:Number(w.progress_credits)}}:null,plays:Number(playCount.rows[0].count),inventory:bag.rows.map(x=>({...x,recycleRP:Number(x.recycle_rp)})),config:{currency:config.currency,passCredits:config.passCredits,goldTicketSP:config.goldTicketSP,shippingEnabled:config.shippingEnabled},prizes:prizes.rows.map(p=>({...p,weight:Number(p.weight),stock:Number(p.stock),recycleRP:Number(p.recycle_rp),priceRP:Number(p.price_rp),spReward:Number(p.sp_reward)})) };
}
async function finish(c,res,status,out) { await c.end().catch(()=>{}); send(res,status,out); }
function errorResponse(res,e) { if(e.code==='23505')return send(res,409,{error:'資料已存在，請檢查輸入內容。'});if((e.status||500)>=500)console.error('PetClaw API error:',e);send(res,e.status||500,{error:e.status?e.message:'伺服器暫時無法完成操作。'}); }

module.exports={db,send,method,body,userFor,requireUser,setSession,clearSession,cookieHash,passwordHash,checkPassword,wallet,publicState,finish,errorResponse,DEFAULT_CONFIG};
