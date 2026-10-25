# My AI Pet PetClaw

前台遊戲與管理後台的整合式 MVP。前台保留原有的 Game Boy 風格掌上夾娃娃機；Vercel Node Functions 提供帳戶、遊戲、點數、獎品倉庫、兌換、配送申請與管理 API；PostgreSQL 保存跨裝置的玩家資料。

## 本版決策

- SP 僅作賽季排名，與 RP、Credits 分開保管；核發、消耗和得獎不會自動換成其他幣別。
- RP 與 Credits 各自消耗、累積保夾進度，互不合併；任一幣別中獎，只重置該幣別進度。
- RP 先以 300 RP/次、3,000 RP 保夾門檻作為可調整的示範值；Credits 先以 10 Credits/次、150 Credits 保夾門檻作為示範值。兩者從達標的那次遊玩開始使用強爪；已達標後的失敗遊玩免費，直到中獎。強爪仍須瞄準。
- 一般爪中獎率預設 10%；達標強爪在瞄準時預設 100%。這些都是後台可調整的試辦設定，不是營運承諾。
- 新玩家預設餘額為 0。管理員可分別核發 SP、RP、Credits。
- Credits 的 Pass 發放量預設 150，但金流尚未接入，所以現階段以管理員核發代替付款流程。
- RP 商品商店兌換價、回收 RP、獎品權重和庫存皆可在後台設定。示範獎品的預設數量與價格只供測試。
- 寄送申請會保存地址並建立待處理訂單；尚未接物流商，也不會自動產生運單。

## 部署需求

Vercel 專案需連接 PostgreSQL（例如 Vercel Marketplace 的 Neon），並設定以下環境變數：

- `POSTGRES_URL`：資料庫連線字串（使用 SSL）。也接受 `DATABASE_URL`。
- `ADMIN_EMAIL`：唯一管理員登入 Email。
- `ADMIN_PASSWORD`：管理員登入密碼，至少 8 個字元；請使用密碼管理器產生，不要提交到 Git。

首次呼叫 API 時會自動建立資料表並加入示範獎品。部署完成後前往 `/admin.html`，使用上述管理員憑證登入。玩家從機台的「登入」建立帳戶。帳戶密碼以 scrypt 雜湊儲存，登入狀態使用 HttpOnly Cookie。

此 repo 維持 Vercel 的 `public` 靜態輸出目錄；根目錄 `api/` 下的 Node Functions 和靜態前台會由同一個 Vercel 網域提供，避免跨網域 cookie 設定。

## 本機檢查

```sh
pnpm install
pnpm check
node --check api/auth.js
node --check api/play.js
node --check api/rewards.js
node --check api/admin.js
```

用 Vercel CLI 執行完整本機串接時，先在 Vercel 專案連結 PostgreSQL 並拉取環境變數，再執行 `vercel dev`。不要將真實 `.env` 檔或資料庫密碼提交到 Git。

## 可分享的公開演示模式

- 玩家入口：`/?demo=1`。測試帳號 `player@demo.example.com`，密碼 `PetClawDemo2026!`。
- 管理後台：`/admin.html?demo=1`。測試帳號 `admin@demo.example.com`，密碼 `PetClawAdmin2026!`。
- 演示模式不呼叫正式 API 或資料庫；每位訪客的狀態只存在自己的瀏覽器 `localStorage`，可在管理員登入畫面按「重設演示資料」還原（若已登入，先登出）。
- 這是公開假資料，請勿輸入真實姓名、電話或地址。正式前後台仍需完成 Vercel PostgreSQL 與管理員環境變數設定，再從不帶 `?demo=1` 的網址登入。
## API

- `GET /api/state`：公開獎品與設定、登入者錢包和倉庫摘要。
- `POST /api/auth`：註冊、登入、登出。
- `POST /api/play`：伺服器扣點、套用該幣別保夾規則、抽獎、更新庫存與帳務。
- `GET/POST /api/rewards`：商品商店、倉庫、RP 兌換、回收與合併寄送申請。
- `GET/POST /api/admin`：遊戲設定、機率、保夾門檻、獎品庫存、點數核發、訂單和遊玩紀錄。

## 尚待正式營運整合

本 MVP 提供可連動的帳戶／管理後台／資料庫流程；它沒有收款金流、Pass 購買 webhook、現有 My AI PET 任務/SP 事件 API、物流商標籤、Email 驗證或忘記密碼流程。上線收費前需補上這些服務並完成安全、隱私與壓力測試。遊戲中的瞄準位置由瀏覽器傳入後端，本版讓抽獎率與扣點在伺服器執行；正式營運前還應進一步讓機台場景狀態由伺服器簽章或驗證，降低偽造瞄準結果的風險。
