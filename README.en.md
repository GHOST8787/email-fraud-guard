[繁體中文](./README.md) | **English**

# Email Fraud Guard — Gmail Phishing Email Detection

> 📅 Project started: 2026-03

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Platform](https://img.shields.io/badge/platform-Chrome-brightgreen?logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)

Automatically scans sender domains in Gmail, flagging emails from "trusted official" and "known fraud" domains to protect users from clicking into phishing emails.

---

## ✨ Features

- **Automatic flagging** — automatically reads the sender of emails when Gmail is opened
- **Whitelist** — verified official institution domains (banks, e-commerce, government agencies, etc.) are marked "✅ 官方可信"
- **Blacklist** — known fraud domains or suspicious regex patterns are marked "⚠️ 可疑詐騙"
- **Cloud database sync** — periodically pulls the latest database via the GitHub Releases API (`alarms` scheduling)
- **No data collection** — all reading is done locally; no user email content is uploaded

---

## 📥 Installation

> Not yet published on the Chrome Web Store; currently only manual installation is supported.

1. Download or clone this repo
2. Open Chrome and go to `chrome://extensions`
3. Turn on "**Developer mode**" in the top-right corner
4. Click "**Load unpacked**" → select this project folder
5. Go to `https://mail.google.com/` to see it in action

---

## 🔒 Permissions

| Permission | Purpose |
|---|---|
| `storage` | Store the whitelist/blacklist database and version number |
| `activeTab` | Inject the content script into the current Gmail tab |
| `alarms` | Periodically check whether a new version of the database is available |
| `host_permissions: mail.google.com` | Read and flag the Gmail email list |
| `host_permissions: api.github.com` | Download the latest database from GitHub Releases |

This extension **does not** collect or upload any email content or user data.

---

## 📦 Database source

The whitelist/blacklist is maintained in a separate repo:

🔗 **<https://github.com/GHOST8787/email-fraud-guard-db>**

It contains:
- `whitelist.json` — verified official institution domains
- `blacklist.json` — known fraud domains + regex patterns
- `version.json` — version number (YYYYMMDD format)

The extension automatically pulls the latest version via the GitHub Releases API.

---

## 📂 Project structure

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

## 🛠️ Development

This project is a pure JavaScript Chrome Extension — no build required.

After directly editing files like `content.js` or `background.js`, just go to `chrome://extensions` and click "Reload" on the extension card.

---

## 📄 License

Personal project, commercial use is not currently authorized.
