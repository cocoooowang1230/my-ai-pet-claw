# My AI Pad 夾娃娃機原型

可直接在瀏覽器遊玩的靜態網頁原型。入口為 `public/index.html`，不需安裝套件，也沒有建置步驟。

## 遊戲內容

- 搖桿、方向鍵或 WASD 移動爪子，按下抓取按鈕或空白鍵下爪。
- 拖曳場景環視，滾輪縮放，並提供正面、左側、右側、俯視及底部視角。
- 切換膠囊球／玩偶，並混入金色獎券；支援開獎動畫、收藏與示範領獎表單。
- 每次付費抓取使用 10 個示範 credits，初始提供 300 credits。
- 弱爪在對準獎品時有 10% 成功機率；未對準仍會落空。
- 自上次中獎起累計消耗達 150 credits 的那次抓取啟用強爪。之後維持強爪並免費重抓，直到成功抓到獎品；中獎後累計歸零，恢復付費與弱爪。強爪仍需瞄準。
- 金色獎券提供 500 示範 season points。

## 部署到 Vercel

1. 在 Vercel 的 New Project 匯入 GitHub 儲存庫 `cocoooowang1230/my-ai-pet-claw`。
2. Root Directory 保持儲存庫根目錄；使用已提交的 `vercel.json`。
3. 點 Deploy，完成後開啟 Vercel 提供的網址。

設定為 Framework Preset: Other、Output Directory: public，略過安裝與建置。之後推送至 main 會由已連接的 Vercel 專案自動部署。

## 本機開啟

下載儲存庫並解壓縮後，用瀏覽器開啟 `public/index.html` 即可。

## 原型範圍與驗證

進度儲存在目前瀏覽器的 localStorage，不會跨裝置同步。Credits、獎品和點數均為示範資料；沒有金流、後端帳戶、實際寄送或防作弊機制。領獎表單只模擬完成狀態，不傳送或儲存地址。角色為程式繪製的示意圖。

已通過 JavaScript 語法檢查與 13 項模擬 DOM／Canvas 互動檢查，並驗證 150 credits 門檻、連續 100 次免費落空、強爪中獎與歸零後恢復扣款。尚未完成真實瀏覽器的視覺與裝置測試。
