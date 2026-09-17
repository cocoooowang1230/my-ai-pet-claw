# My AI Pet 夾娃娃機原型

Game Boy 掌上機概念的單屏夾娃娃遊戲。手機直式／橫式都讓搖桿、下爪鍵與遊戲畫面留在可視範圍；桌面版保留品牌介紹與獎品展示。可直接在瀏覽器遊玩的靜態網頁原型。入口為 `public/index.html`，不需安裝套件，也沒有建置步驟。

## 遊戲內容

- 搖桿、方向鍵或 WASD 移動爪子，按下抓取按鈕或空白鍵下爪。
- 拖曳場景環視，滾輪縮放，並提供正面、左側、右側、俯視及底部視角。
- 20 件獎品以隨機位置、角度與高度散落；成功抓取後補入新位置，落下時略微改變姿態。保留出獎口空間，所有獎品中心皆可瞄準。
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

保留舊版 localStorage 識別鍵以延續遊戲進度。品牌名稱統一為 My AI Pet；寵物以程式繪製的示意玩偶呈現。

## 驗證

GitHub Actions 的 `Pocket Claw browser checks` 使用 Chromium 與 WebKit 檢查手機與桌面配置、觸控搖桿、保夾流程及存檔。截圖保留在工作流程的 artifacts。測試依賴只安裝於 CI，遊戲本身沒有執行階段套件依賴。
