/* Public, disposable browser-only demo. Never uses the real API or database. */
(function () {
  // A local file preview has no server API. Automatically use the disposable
  // browser demo so its purchase and warehouse flows share the same store.
  const demoMode = new URLSearchParams(location.search).get('demo') === '1' || location.protocol === 'file:';
  if (!demoMode) return;

  const basePath = location.pathname.replace(/\/(?:index\.html|admin\.html)?$/, '').replace(/\/$/, '');
  const KEY = 'petclaw-public-demo-v1';
  const PLAYER = { email: 'player@demo.example.com', password: 'PetClawDemo2026!' };
  const ADMIN = { email: 'admin@demo.example.com', password: 'PetClawAdmin2026!' };
  const DEFAULT_CONFIG = {
    currency: {
      RP: { cost: 300, threshold: 3000, weakChance: 0.1, strongChance: 1 },
      Credits: { cost: 10, threshold: 150, weakChance: 0.1, strongChance: 1 },
      SP: { cost: 100, threshold: 0, weakChance: 0.1, strongChance: 1 }
    },
    passCredits: 150,
    goldTicketSP: 500,
    shippingEnabled: true,
    shippingCountries: ['TW'],
    registrationEnabled: true
  };
  const DEFAULT_PRIZES = [
    { id: 'demo-biscuit', name: 'MY AI PET Biscuit 玩偶', kind: 'plush', weight: 8, stock: 20, recycle_rp: 250, recycle_sp: 100, recycle_credits: 50, price_rp: 1200, price_credits: 60, price_sp: 900, sp_reward: 0, pool_rp: true, pool_credits: true, pool_sp: true, active: true, image_data: '', display_style: '3d' },
    { id: 'demo-partner', name: '合作寵物吊飾', kind: 'physical', weight: 18, stock: 30, recycle_rp: 100, recycle_sp: 40, recycle_credits: 20, price_rp: 500, price_credits: 30, price_sp: 400, sp_reward: 0, pool_rp: true, pool_credits: true, pool_sp: true, active: true, image_data: '', display_style: '3d' },
    { id: 'demo-ticket', name: '金色 Season Points 券', kind: 'ticket', weight: 2, stock: 50, recycle_rp: 0, price_rp: 0, sp_reward: 500, pool_rp: true, pool_credits: true, active: true, image_data: '', display_style: '3d' },
    { id: 'demo-capsule', name: '驚喜球', kind: 'capsule', weight: 12, stock: 50, recycle_rp: 150, price_rp: 800, sp_reward: 0, pool_rp: true, pool_credits: true, active: true, image_data: '', display_style: '3d' },
    { id: 'demo-limited', name: '限定 MY AI PET 玩偶', kind: 'physical', weight: 1, stock: 5, recycle_rp: 1500, recycle_sp: 600, recycle_credits: 300, price_rp: 6000, price_credits: 300, price_sp: 5000, sp_reward: 0, pool_rp: false, pool_credits: true, pool_sp: false, active: true, image_data: '', display_style: '3d' }
  ];

  const fresh = () => ({
    user: null,
    wallet: { sp: 1000, rp: 3000, credits: 300, progress: { RP: 0, Credits: 0, SP: 0 } },
    plays: 0,
    config: structuredClone(DEFAULT_CONFIG),
    prizes: structuredClone(DEFAULT_PRIZES),
    inventory: [],
    orders: [],
    playLog: []
  });
  const memoryStore = new Map();
  const storageGet = key => { try { return localStorage.getItem(key); } catch { return memoryStore.get(key) || null; } };
  const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch { memoryStore.set(key, value); } };
  function read() {
    try { const saved=JSON.parse(storageGet(KEY)||'{}'),base=fresh(),merged={...base,...saved};merged.config={...base.config,...(saved.config||{}),currency:{...base.config.currency,...(saved.config?.currency||{})}};merged.wallet={...base.wallet,...(saved.wallet||{}),progress:{...base.wallet.progress,...(saved.wallet?.progress||{})}};merged.prizes=(saved.prizes||base.prizes).map(p=>{const seed=base.prizes.find(x=>x.id===p.id)||{};return{...seed,recycle_sp:p.recycle_sp??seed.recycle_sp??0,recycle_credits:p.recycle_credits??seed.recycle_credits??0,price_credits:p.price_credits??seed.price_credits??0,price_sp:p.price_sp??seed.price_sp??0,pool_sp:p.pool_sp??seed.pool_sp??true,...p};});return merged; }
    catch { return fresh(); }
  }
  let data = read();
  const persist = () => storageSet(KEY, JSON.stringify(data));
  const result = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
  const error = (message, status = 400) => result({ error: message }, status);
  const originalFetch = window.fetch.bind(window);

  function snapshot() {
    return {
      user: data.user,
      wallet: structuredClone(data.wallet),
      plays: data.plays,
      config: structuredClone(data.config),
      prizes: data.prizes.filter(p => p.active && p.kind !== 'capsule').map(p => ({
        ...p, recycleRP: p.recycle_rp, recycleSP: p.recycle_sp,recycleCredits:p.recycle_credits, priceRP: p.price_rp, priceCredits:p.price_credits, priceSP:p.price_sp, spReward: p.sp_reward
      })),
        inventory: data.inventory.filter(i => ['stored', 'shipping_requested', 'delivered'].includes(i.status)).map(i => ({
        ...i, recycleRP: i.recycle_rp,recycleCredits:i.recycle_credits
      }))
    };
  }
  function needUser() { return data.user ? null : error('請先登入演示帳戶。', 401); }
  function needAdmin() {
    return data.user?.role === 'admin' ? null : error('請使用演示管理員帳戶登入。', 403);
  }
  const id = () => 'demo-' + Math.random().toString(36).slice(2, 12);
  const now = () => new Date().toISOString();

  async function route(url, init = {}) {
    const path = new URL(typeof url === 'string' ? url : url.url, location.href).pathname;
    const method = (init.method || 'GET').toUpperCase();
    let body = {};
    try { body = init.body ? JSON.parse(init.body) : {}; } catch { return error('格式錯誤。'); }

    if (path === '/api/state' && method === 'GET') return result(snapshot());
    if (path === '/api/auth' && method === 'POST') {
      if (body.action === 'logout') { data.user = null; persist(); return result({ ok: true }); }
      const admin = body.email === ADMIN.email && body.password === ADMIN.password;
      const player = body.email === PLAYER.email && body.password === PLAYER.password;
      if (!admin && !player) return error('演示帳號或密碼不正確。請使用頁面顯示的固定測試帳號。', 401);
      if (body.action === 'signup') return error('演示模式使用固定測試帳號，不能建立新帳號。', 403);
      data.user = { id: admin ? 'demo-admin' : 'demo-player', email: admin ? ADMIN.email : PLAYER.email, role: admin ? 'admin' : 'player' };
      persist();
      return result({ user: data.user });
    }
    if (path === '/api/play' && method === 'POST') {
      const denied = needUser(); if (denied) return denied;
      const currency = body.currency;
      if (!['RP', 'Credits','SP'].includes(currency)) return error('請選擇 RP、Credits 或 SP。');
      const rule = data.config.currency[currency];
      const balanceKey = {RP:'rp',Credits:'credits',SP:'sp'}[currency];
      const progress = Number(data.wallet.progress[currency] || 0);
      const strong = Number(rule.threshold) > 0 && progress >= Number(rule.threshold);
      const cost = strong ? 0 : Number(rule.cost);
      if (data.wallet[balanceKey] < cost) return error(`${currency} 餘額不足。`, 402);
      const pool = data.prizes.filter(p => p.active && p.kind !== 'capsule' && p.stock > 0 && p[{RP:'pool_rp',Credits:'pool_credits',SP:'pool_sp'}[currency]]);
      if (!pool.length) return error('目前此獎池沒有庫存，請稍後再試。', 409);
      const nextProgress = progress + cost;
      const strongThisPlay = strong || (Number(rule.threshold) > 0 && nextProgress >= Number(rule.threshold));
      const aligned = body.aligned === true;
      const won = aligned && Math.random() < Number(strongThisPlay ? rule.strongChance : rule.weakChance);
      let prize = null;
      let wonInventoryId = null, digitalAward = null;
      if (won) {
        const total = pool.reduce((sum, item) => sum + Math.max(1, Number(item.weight)), 0);
        let pick = Math.random() * total;
        prize = pool.find(item => (pick -= Math.max(1, Number(item.weight))) < 0) || pool[pool.length - 1];
      }
      data.wallet[balanceKey] -= cost;
      data.wallet.progress[currency] = won ? 0 : nextProgress;
      data.plays++;
      if (prize) {
        prize.stock--;
        const spReward = Number(prize.sp_reward) > 0 ? Number(prize.sp_reward) : Number(data.config.goldTicketSP) || 0;
        if (prize.kind === 'ticket') { data.wallet.sp += spReward; digitalAward={currency:'SP',amount:spReward}; }
        else if(prize.kind==='digital'){
          const currency=prize.digital_currency||'SP',amount=Number(prize.digital_amount)||0;
          if(['SP','RP','Credits'].includes(currency)&&amount>0){const key={SP:'sp',RP:'rp',Credits:'credits'}[currency];data.wallet[key]+=amount;digitalAward={currency,amount};}
          else if(currency==='Coupon'){wonInventoryId=id();digitalAward={currency,amount:0,code:prize.digital_code||''};data.inventory.unshift({id:wonInventoryId,name:prize.name,kind:prize.kind,prize_id:prize.id,status:'delivered',created_at:now(),recycle_rp:prize.recycle_rp,digital_currency:currency,digital_amount:0,digital_code:prize.digital_code||'',image_data:prize.image_data||''});}
        }else{wonInventoryId=id();data.inventory.unshift({id:wonInventoryId,name:prize.name,kind:prize.kind,prize_id:prize.id,status:'stored',created_at:now(),recycle_rp:prize.recycle_rp,recycle_sp:prize.recycle_sp||0,recycle_credits:prize.recycle_credits||0,recycleRP:prize.recycle_rp});}
      }
      data.playLog.unshift({ id: id(), created_at: now(), email: data.user.email, currency, cost, strong: strongThisPlay, success: !!prize, prize_name: prize?.name || null });
      persist();
      return result({
        success: !!prize,
        strong: strongThisPlay || data.wallet.progress[currency] >= Number(rule.threshold),
        charged: cost,
        prize: prize ? { id: prize.id, inventoryId: wonInventoryId, name: prize.name, kind: prize.kind, spReward: Number(prize.sp_reward) || Number(data.config.goldTicketSP) || 0, digitalCurrency:prize.digital_currency||'SP',digitalAmount:Number(prize.digital_amount)||0,digitalCode:prize.digital_code||'',digitalAward,recycleRP: Number(prize.recycle_rp),recycleSP:Number(prize.recycle_sp)||0,recycleCredits:Number(prize.recycle_credits)||0, image_data: prize.image_data || '', display_style: prize.display_style || '2d' } : null,
        state: snapshot()
      });
    }
    if (path === '/api/rewards') {
      const denied = needUser(); if (denied) return denied;
      if (method === 'GET') return result({
        shop: data.prizes.filter(p => p.active && ['physical','plush'].includes(p.kind)).map(p => ({ ...p, id: p.id, name: p.name, kind: p.kind, stock: p.stock, recycle_rp: p.recycle_rp, recycle_sp:p.recycle_sp||0,recycle_credits:p.recycle_credits||0, price_rp: p.price_rp, price_credits:p.price_credits||0, price_sp:p.price_sp||0, pool_rp: p.pool_rp, pool_credits: p.pool_credits,pool_sp:p.pool_sp!==false })),
        warehouse: structuredClone(data.inventory),
        orders: structuredClone(data.orders).map(o => ({ id: o.id, status: o.status, created_at: o.created_at, recipient:o.recipient, phone:o.phone, address:o.address, email:o.email, inventory_ids:o.inventory_ids }))
      });
      if (body.action === 'redeem') {
        const prize = data.prizes.find(p => p.id === body.prizeId && p.active && p.stock > 0 && ['physical','plush'].includes(p.kind));
        if (!prize) return error('商品目前無庫存。', 409);
        const currency=body.currency||'RP',field={RP:'rp',Credits:'credits',SP:'sp'}[currency],price={RP:'price_rp',Credits:'price_credits',SP:'price_sp'}[currency];if(!field)return error('請選擇有效付款點數。');const cost=Number(prize[price]||0);
        if (!cost || data.wallet[field] < cost) return error(`${currency} 餘額不足或商品價格尚未設定。`, 402);
        data.wallet[field] -= cost; prize.stock--;
        const inventoryId=id();data.inventory.unshift({ id: inventoryId, name: prize.name, kind: prize.kind, prize_id: prize.id, status: 'stored', created_at: now(), recycle_rp: prize.recycle_rp, recycle_sp:prize.recycle_sp||0,recycle_credits:prize.recycle_credits||0, image_data:prize.image_data||'', recycleRP: prize.recycle_rp,recycleSP:prize.recycle_sp||0 });
        persist(); return result({ ok: true, inventoryId, prizeId:prize.id, name:prize.name, kind:prize.kind, image_data:prize.image_data||"", recycle_rp:Number(prize.recycle_rp)||0, recycle_sp:Number(prize.recycle_sp)||0, recycle_credits:Number(prize.recycle_credits)||0 });
      }
      if (body.action === 'recycle') {
        const item = data.inventory.find(i => i.id === body.inventoryId && i.status === 'stored');
        if (!item) return error('找不到可回收的獎品。', 404);
        const currency=body.currency||'RP',field={RP:'rp',Credits:'credits',SP:'sp'}[currency];if(!field)return error('請選擇 RP、Credits 或 SP。');const credited=Number(({RP:item.recycle_rp,Credits:item.recycle_credits,SP:item.recycle_sp})[currency]||0);if(credited<=0)return error('此獎品尚未設定此幣別回收點數。');item.status='recycled';data.wallet[field]+=credited;
        persist(); return result({ ok: true, credited,currency });
      }
      if (body.action === 'ship') {
        if (data.config.shippingEnabled === false) return error('配送功能暫時關閉。', 403);if(!(data.config.shippingCountries||['TW']).includes(String(body.country||'').toUpperCase()))return error('目前不配送至所選國家。請改選可配送國家，或將獎品回收成 RP、Credits 或 SP。',403);
        const ids = [...new Set(Array.isArray(body.inventoryIds) ? body.inventoryIds : [])];
        const items = data.inventory.filter(i => ids.includes(i.id) && i.status === 'stored' && ['physical','plush'].includes(i.kind));
        if (!ids.length || items.length !== ids.length) return error('請選擇可寄送的獎品。', 409);
        const order = { id: id(), user_id: data.user.id, email: data.user.email, inventory_ids: ids, recipient: String(body.recipient || ''), phone: String(body.phone || ''), address: String(body.address || ''), country:String(body.country||'').toUpperCase(), destination_country:String(body.country||'').toUpperCase(), contact_email:String(body.email||''), status: 'requested', created_at: now() };
        if (!order.recipient || !order.phone || !order.address || !/^\S+@\S+\.\S+$/.test(order.contact_email)) return error('請填寫有效的收件人、電話、Email 與地址。');
        items.forEach(i => { i.status = 'shipping_requested'; }); data.orders.unshift(order); persist();
        return result({ ok: true, orderId: order.id });
      }
      return error('未知的獎品操作。');
    }
    if (path === '/api/admin') {
      const denied = needAdmin(); if (denied) return denied;
      if (method === 'GET') return result({
        config: structuredClone(data.config), prizes: structuredClone(data.prizes),
        plays: structuredClone(data.playLog),
        orders: structuredClone(data.orders),
        users: [{ id: 'demo-player', email: PLAYER.email, created_at: now(), sp: data.wallet.sp, rp: data.wallet.rp, credits: data.wallet.credits }]
      });
      if (body.action === 'config') { data.config = structuredClone(body.config); persist(); return result({ ok: true }); }
      if (body.action === 'grant') {
        const key = { SP: 'sp', RP: 'rp', Credits: 'credits' }[body.currency], amount = Number(body.amount);
        if (!key || !Number.isSafeInteger(amount) || amount < 1) return error('核發數量必須是正整數。');
        data.wallet[key] += amount; persist(); return result({ ok: true });
      }
      if (body.action === 'prize') {
        const p = body.prize || {}, existing = data.prizes.find(x => x.id === p.id);
        const imageData = String(p.imageData || ''), displayStyle = p.displayStyle || '3d';
        if (imageData.length > 720000 || (imageData && !/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(imageData))) return error('獎品圖片格式無效或圖片太大。');
        if (!['plush','physical','ticket','digital'].includes(p.kind)) return error('請選擇實體或數位獎品類型。');
        if (p.kind==='digital'&&p.digitalCurrency==='Coupon'&&!String(p.digitalCode||'').trim()) return error('數位折價券請填寫折價碼或兌換代碼。');
        if (p.kind==='digital'&&p.digitalCurrency!=='Coupon'&&Number(p.digitalAmount)<1) return error('數位點數獎品數量至少為 1。');
        if (!['2d','3d'].includes(displayStyle)) return error('獎品呈現方式無效。');
        const item = { id: p.id || id(), name: p.name, kind: p.kind, stock: Number(p.stock), weight: Number(p.weight), recycle_rp: Number(p.recycleRP),recycle_sp:Number(p.recycleSP)||0,recycle_credits:Number(p.recycleCredits)||0, price_rp: Number(p.priceRP),price_credits:Number(p.priceCredits)||0,price_sp:Number(p.priceSP)||0, sp_reward: Number(p.spReward), pool_rp: !!p.poolRP, pool_credits: !!p.poolCredits,pool_sp:!!p.poolSP, active: !!p.active, image_data: imageData, display_style: displayStyle,digital_currency:p.digitalCurrency||'SP',digital_amount:Number(p.digitalAmount)||0,digital_code:String(p.digitalCode||'') };
        if (!item.name || !Number.isSafeInteger(item.stock) || item.stock < 0) return error('請輸入有效獎品名稱與庫存。');
        if (existing) Object.assign(existing, item); else data.prizes.unshift(item);
        persist(); return result({ ok: true, id: item.id });
      }
      if (body.action === 'orderStatus') {
        const order = data.orders.find(o => o.id === body.orderId);
        if (!order) return error('找不到寄送訂單。', 404);
        const allowed = { requested: ['approved', 'cancelled'], approved: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
        if (!allowed[order.status]?.includes(body.status)) return error('此訂單狀態無法進行該轉換。', 409);
        order.status = body.status;
        if (body.status === 'cancelled') data.inventory.filter(i => order.inventory_ids.includes(i.id) && i.status === 'shipping_requested').forEach(i => { i.status = 'stored'; });
        persist(); return result({ ok: true });
      }
      return error('未知的後台操作。');
    }
    return error('演示 API 找不到此路徑。', 404);
  }

  window.__petclawDemo = true;
  window.fetch = function (input, init) {
    const href = typeof input === 'string' ? input : input.url;
    if (new URL(href, location.href).pathname.startsWith('/api/')) return route(input, init);
    return originalFetch(input, init);
  };

  const announce = () => {
    if (location.pathname.endsWith('/admin.html')) {
      const login = document.querySelector('#login');
      if (login && !login.querySelector('.demo-note')) {
        const note = document.createElement('div'); note.className = 'note demo-note';
        note.innerHTML = '<b>展示後台</b><br>管理員帳號：<code>' + ADMIN.email + '</code><br>密碼：<code>' + ADMIN.password + '</code><br>資料只存在此瀏覽器，請勿輸入真實資料。<br>點「重設演示資料」可還原範例。';
        login.prepend(note);
        const homeLink = document.querySelector('header.top a[aria-label="回到遊戲"]');
        if (homeLink) homeLink.href = basePath + '/?demo=1';
        const reset = document.createElement('button'); reset.textContent = '重設演示資料'; reset.style.marginTop = '10px';
        reset.onclick = () => { localStorage.removeItem(KEY); location.reload(); };
        login.append(reset);
      }
    } else {
      const status = document.querySelector('#accountStatus');
      if (status && !status.textContent.includes('展示模式')) status.textContent = '展示模式（僅此瀏覽器資料） · ' + status.textContent;
      const demoNote = document.querySelector('.side-notes .demo-note');
      if (demoNote) demoNote.innerHTML = '展示模式 · 資料只存在此瀏覽器。<br>請勿填寫真實收件資料。';
      const accountForm = document.querySelector('#accountForm');
      if (accountForm && !accountForm.querySelector('.demo-note')) {
        const note = document.createElement('p'); note.className = 'muted demo-note';
        note.innerHTML = '演示帳號：<code>' + PLAYER.email + '</code><br>密碼：<code>' + PLAYER.password + '</code><br>這是公開假資料，請勿輸入真實收件資訊。';
        accountForm.prepend(note);
        const adminLink = document.querySelector('#modalContent a[href="/admin.html"]'); if (adminLink) adminLink.href = basePath + '/admin.html?demo=1';
      }
    }
  };
  document.addEventListener('DOMContentLoaded', announce);
  document.addEventListener('click', event => { if (event.target.closest('#account')) setTimeout(announce, 0); });
})();
