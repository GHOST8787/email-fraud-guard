/**
 * db-loader.js
 * 負責載入白名單和黑名單 DB
 * 優先從 chrome.storage.local 讀取（GitHub Releases 更新版）
 * Fallback 讀取 Extension 內建的 db/ 資料夾
 */

const DbLoader = (() => {
  let _whitelist = null;
  let _blacklist = null;

  /**
   * 從 chrome.storage.local 讀取 DB
   */
  async function loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['whitelist', 'blacklist'], (result) => {
        resolve({
          whitelist: result.whitelist || null,
          blacklist: result.blacklist || null,
        });
      });
    });
  }

  /**
   * 從 Extension 內建的 db/ 資料夾讀取
   */
  async function loadFromBuiltin() {
    try {
      const [whitelistResp, blacklistResp] = await Promise.all([
        fetch(chrome.runtime.getURL('db/whitelist.json')),
        fetch(chrome.runtime.getURL('db/blacklist.json')),
      ]);
      return {
        whitelist: await whitelistResp.json(),
        blacklist: await blacklistResp.json(),
      };
    } catch (err) {
      console.error('[EmailFraudGuard] 無法載入內建 DB:', err);
      return { whitelist: null, blacklist: null };
    }
  }

  /**
   * 載入 DB（優先 storage，fallback 內建）
   * @returns {{ whitelist: object, blacklist: object }}
   */
  async function load() {
    if (_whitelist && _blacklist) {
      return { whitelist: _whitelist, blacklist: _blacklist };
    }

    // 優先從 storage 讀取
    const stored = await loadFromStorage();

    if (stored.whitelist && stored.blacklist) {
      _whitelist = stored.whitelist;
      _blacklist = stored.blacklist;
      console.log('[EmailFraudGuard] DB 從 storage 載入，版本:', _whitelist.version);
      return { whitelist: _whitelist, blacklist: _blacklist };
    }

    // Fallback: 內建 DB
    const builtin = await loadFromBuiltin();
    _whitelist = builtin.whitelist;
    _blacklist = builtin.blacklist;
    console.log('[EmailFraudGuard] DB 從內建檔案載入，版本:', _whitelist?.version);
    return { whitelist: _whitelist, blacklist: _blacklist };
  }

  /**
   * 清除快取，強制下次重新載入
   */
  function invalidateCache() {
    _whitelist = null;
    _blacklist = null;
  }

  return { load, invalidateCache };
})();
