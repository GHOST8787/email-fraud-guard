/**
 * background.js
 * Service Worker - 負責定期檢查 GitHub Releases 更新 DB
 */

// ===== 設定 =====
const GITHUB_REPO = 'GHOST8787/email-fraud-guard-db';
const CHECK_INTERVAL_HOURS = 24;
const ALARM_NAME = 'check-db-update';

// ===== Extension 安裝 / 啟動 =====
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[EmailFraudGuard] Extension 已安裝:', details.reason);

  // 首次安裝時立即檢查更新
  if (details.reason === 'install') {
    checkForUpdates();
  }

  // 設定定期檢查 alarm
  setupAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[EmailFraudGuard] 瀏覽器啟動');
  setupAlarm();
});

// ===== Alarm 監聽 =====
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkForUpdates();
  }
});

// ===== 設定定期檢查 =====
function setupAlarm() {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1, // 啟動後 1 分鐘首次檢查
    periodInMinutes: CHECK_INTERVAL_HOURS * 60,
  });
}

// ===== 檢查 GitHub Releases 更新 =====
async function checkForUpdates() {
  try {
    console.log('[EmailFraudGuard] 檢查 DB 更新...');

    // 取得上次記錄的版本
    const stored = await chrome.storage.local.get(['dbVersion', 'lastUpdateCheck']);
    const currentVersion = stored.dbVersion || '0';
    const lastCheck = stored.lastUpdateCheck || 0;

    // 防止過於頻繁的檢查（最少間隔 1 小時）
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - lastCheck < oneHour) {
      console.log('[EmailFraudGuard] 距離上次檢查不到 1 小時，跳過');
      return;
    }

    // 呼叫 GitHub API
    const releaseUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const response = await fetch(releaseUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[EmailFraudGuard] GitHub repo 尚未建立或無 releases');
      } else {
        console.warn('[EmailFraudGuard] GitHub API 回應:', response.status);
      }
      // 記錄檢查時間，即使失敗
      await chrome.storage.local.set({ lastUpdateCheck: Date.now() });
      return;
    }

    const release = await response.json();

    // 從 release assets 中找到 version.json
    const versionAsset = release.assets?.find(a => a.name === 'version.json');
    if (!versionAsset) {
      console.log('[EmailFraudGuard] Release 中沒有 version.json');
      await chrome.storage.local.set({ lastUpdateCheck: Date.now() });
      return;
    }

    // 下載 version.json 確認版本
    const versionResp = await fetch(versionAsset.browser_download_url);
    const versionData = await versionResp.json();

    if (versionData.version <= currentVersion) {
      console.log('[EmailFraudGuard] DB 已是最新版本:', currentVersion);
      await chrome.storage.local.set({ lastUpdateCheck: Date.now() });
      return;
    }

    // 版本較新，下載新的 DB
    console.log('[EmailFraudGuard] 發現新版 DB:', versionData.version);

    const whitelistAsset = release.assets?.find(a => a.name === 'whitelist.json');
    const blacklistAsset = release.assets?.find(a => a.name === 'blacklist.json');

    if (!whitelistAsset || !blacklistAsset) {
      console.warn('[EmailFraudGuard] Release 缺少 whitelist.json 或 blacklist.json');
      return;
    }

    const [whitelistResp, blacklistResp] = await Promise.all([
      fetch(whitelistAsset.browser_download_url),
      fetch(blacklistAsset.browser_download_url),
    ]);

    const whitelist = await whitelistResp.json();
    const blacklist = await blacklistResp.json();

    // 存進 chrome.storage.local
    await chrome.storage.local.set({
      whitelist,
      blacklist,
      dbVersion: versionData.version,
      lastUpdateCheck: Date.now(),
      lastUpdateSuccess: Date.now(),
    });

    console.log('[EmailFraudGuard] DB 更新成功！版本:', versionData.version);

  } catch (err) {
    console.error('[EmailFraudGuard] 更新 DB 失敗:', err);
    await chrome.storage.local.set({ lastUpdateCheck: Date.now() });
  }
}

// ===== 來自 popup 的訊息 =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'forceUpdate') {
    checkForUpdates().then(() => sendResponse({ success: true }));
    return true; // 保持 sendResponse 有效
  }

  if (message.action === 'getStatus') {
    chrome.storage.local.get(['dbVersion', 'lastUpdateSuccess', 'stats'], (result) => {
      sendResponse({
        dbVersion: result.dbVersion || '內建版本',
        lastUpdate: result.lastUpdateSuccess ? new Date(result.lastUpdateSuccess).toLocaleString('zh-TW') : '尚未更新',
        stats: result.stats || { safe: 0, unknown: 0, danger: 0 },
      });
    });
    return true;
  }
});
