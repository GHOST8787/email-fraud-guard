/**
 * checker.js
 * 判斷寄件人 email 的危險等級
 *
 * 輸入：displayName (顯示名稱) + email (完整 email 地址)
 * 輸出：{ level: "safe" | "unknown" | "danger", reason: string }
 *
 * 判斷順序：
 * 1. domain 在 blacklist → danger（已知詐騙）
 * 2. 顯示名稱包含白名單機構名稱，但 domain 不在 whitelist → danger（偽造）
 * 3. domain 在 whitelist → safe
 * 4. 以上都不符合 → unknown
 */

const EmailChecker = (() => {
  /**
   * 從 email 中提取 domain
   */
  function extractDomain(email) {
    if (!email || !email.includes('@')) return '';
    return email.split('@').pop().toLowerCase().trim();
  }

  /**
   * 檢查 domain 是否匹配（支援子域名）
   * 例如 "mail.google.com" 匹配 "google.com"
   */
  function domainMatches(emailDomain, listDomain) {
    const normalizedEmail = emailDomain.toLowerCase();
    const normalizedList = listDomain.toLowerCase();
    return normalizedEmail === normalizedList ||
           normalizedEmail.endsWith('.' + normalizedList);
  }

  /**
   * 檢查 domain 是否在黑名單中（含 regex patterns）
   */
  function checkBlacklist(domain, blacklist) {
    if (!blacklist) return null;

    // 直接比對 domain
    for (const blDomain of Object.keys(blacklist.domains || {})) {
      if (domainMatches(domain, blDomain)) {
        return blacklist.domains[blDomain];
      }
    }

    // regex pattern 比對
    for (const pattern of (blacklist.patterns || [])) {
      try {
        if (new RegExp(pattern, 'i').test(domain)) {
          return `符合可疑模式: ${pattern}`;
        }
      } catch {
        // 無效 regex，跳過
      }
    }

    return null;
  }

  /**
   * 檢查 domain 是否在白名單中
   */
  function checkWhitelist(domain, whitelist) {
    if (!whitelist) return false;

    for (const wlDomain of Object.keys(whitelist.domains || {})) {
      if (domainMatches(domain, wlDomain)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 檢查顯示名稱是否包含白名單機構名稱
   */
  function displayNameMatchesOrg(displayName, whitelist) {
    if (!displayName || !whitelist?.orgNames) return null;

    const normalized = displayName.toLowerCase();
    for (const orgName of whitelist.orgNames) {
      if (normalized.includes(orgName.toLowerCase())) {
        return orgName;
      }
    }
    return null;
  }

  /**
   * 主要判斷函式
   * @param {string} displayName - 寄件人顯示名稱
   * @param {string} email - 寄件人 email
   * @param {{ whitelist: object, blacklist: object }} db - 資料庫
   * @returns {{ level: "safe" | "unknown" | "danger", reason: string }}
   */
  function check(displayName, email, db) {
    const domain = extractDomain(email);

    if (!domain) {
      return { level: 'unknown', reason: '無法解析 email 地址' };
    }

    const { whitelist, blacklist } = db;

    // 1. 黑名單檢查
    const blacklistReason = checkBlacklist(domain, blacklist);
    if (blacklistReason) {
      return {
        level: 'danger',
        reason: `已知詐騙網域：${blacklistReason}`,
      };
    }

    // 2. 偽造檢查：顯示名稱含機構名，但 domain 不在白名單
    const matchedOrg = displayNameMatchesOrg(displayName, whitelist);
    if (matchedOrg && !checkWhitelist(domain, whitelist)) {
      return {
        level: 'danger',
        reason: `疑似偽造「${matchedOrg}」— 網域 ${domain} 不在官方白名單`,
      };
    }

    // 3. 白名單檢查
    if (checkWhitelist(domain, whitelist)) {
      return {
        level: 'safe',
        reason: `已驗證官方網域：${domain}`,
      };
    }

    // 4. 未知
    return {
      level: 'unknown',
      reason: `未知寄件人：${domain}`,
    };
  }

  return { check, extractDomain };
})();
