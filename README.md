# Email Fraud Guard — Gmail 詐騙信件偵測

> 📅 專案開始：2026-03

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Platform](https://img.shields.io/badge/platform-Chrome-brightgreen?logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)

在 Gmail 上自動掃描寄件人網域，標記「可信任官方」與「已知詐騙網域」的信件，保護使用者不點進釣魚信。

---

## ✨ 功能

- **自動標記** — 開啟 Gmail 時自動判讀信件寄件人
- **白名單** — 驗證過的官方機構網域（銀行、電商、政府單位等）會標註「✅ 官方可信」
- **黑名單** — 已知詐騙網域或可疑 regex pattern 會標註「⚠️ 可疑詐騙」
- **資料庫雲端同步** — 透過 GitHub Releases API 定期拉取最新資料庫（`alarms` 排程）
- **不收集資料** — 所有判讀在本機進行，不上傳任何使用者信件內容

---

## 📥 安裝

> 尚未上架 Chrome Web Store，目前僅支援手動安裝。

1. 下載或 clone 此 repo
2. 開啟 Chrome，前往 `chrome://extensions`
3. 右上角開啟「**開發人員模式**」
4. 點擊「**載入未封裝項目**」→ 選擇此專案資料夾
5. 前往 `https://mail.google.com/` 即可看到效果

---

## 🔒 權限說明

| 權限 | 用途 |
|---|---|
| `storage` | 儲存白/黑名單資料庫與版本號 |
| `activeTab` | 在目前 Gmail 分頁注入內容腳本 |
| `alarms` | 定期檢查資料庫是否有新版本 |
| `host_permissions: mail.google.com` | 讀取並標記 Gmail 信件列表 |
| `host_permissions: api.github.com` | 從 GitHub Releases 下載最新資料庫 |

本擴充功能**不會**收集、上傳任何信件內容或使用者資料。

---

## 📦 資料庫來源

白/黑名單維護在獨立 repo：

🔗 **<https://github.com/GHOST8787/email-fraud-guard-db>**

包含：
- `whitelist.json` — 驗證過的官方機構網域
- `blacklist.json` — 已知詐騙網域 + regex pattern
- `version.json` — 版本號（YYYYMMDD 格式）

擴充功能會透過 GitHub Releases API 自動拉取最新版本。

---

## 📂 專案結構

```
email-fraud-guard/
├── manifest.json        ← Chrome Extension Manifest V3
├── background.js        ← Service Worker（排程更新 DB）
├── content.js           ← 注入 Gmail 的內容腳本
├── popup.html / popup.js ← 工具列 popup UI
├── utils/
│   ├── db-loader.js     ← 載入本機快取的 DB
│   └── checker.js       ← 判讀寄件人網域
├── db/                  ← 本機 fallback DB 快照
└── assets/              ← 圖示與圖片
```

---

## 🛠️ 開發

此專案為純 JavaScript Chrome Extension，不需 build。

直接修改 `content.js`、`background.js` 等檔案後，到 `chrome://extensions` 點擊擴充功能卡片的「重新載入」即可。

---

## 📄 授權

個人專案，目前未授權商業使用。
