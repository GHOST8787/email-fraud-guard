/**
 * popup.js
 * Extension 小視窗邏輯
 */

document.addEventListener('DOMContentLoaded', () => {
  const statSafe = document.getElementById('stat-safe');
  const statUnknown = document.getElementById('stat-unknown');
  const statDanger = document.getElementById('stat-danger');
  const dbVersion = document.getElementById('db-version');
  const lastUpdate = document.getElementById('last-update');
  const btnUpdate = document.getElementById('btn-update');
  const statusMsg = document.getElementById('status-msg');

  // 載入狀態
  loadStatus();

  // 手動更新按鈕
  btnUpdate.addEventListener('click', async () => {
    btnUpdate.disabled = true;
    statusMsg.textContent = '檢查更新中...';

    try {
      await chrome.runtime.sendMessage({ action: 'forceUpdate' });
      statusMsg.textContent = '更新完成！';
      // 重新載入狀態
      setTimeout(loadStatus, 500);
    } catch (err) {
      statusMsg.textContent = '更新失敗：' + err.message;
    } finally {
      btnUpdate.disabled = false;
    }
  });

  function loadStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (!response) return;

      dbVersion.textContent = response.dbVersion;
      lastUpdate.textContent = response.lastUpdate;
      statSafe.textContent = response.stats.safe || 0;
      statUnknown.textContent = response.stats.unknown || 0;
      statDanger.textContent = response.stats.danger || 0;
    });
  }
});
