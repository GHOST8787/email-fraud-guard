/**
 * content.js
 * 注入 Gmail DOM，監聽信件開啟，抓取寄件人並顯示 badge
 */

(() => {
  'use strict';

  // 避免重複注入
  if (window.__emailFraudGuardLoaded) return;
  window.__emailFraudGuardLoaded = true;

  const BADGE_ATTR = 'data-efg-checked';
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  // Badge 樣式
  const BADGE_STYLES = {
    safe: {
      bg: '#d4edda',
      border: '#28a745',
      color: '#155724',
      icon: '\u2705',
      text: '\u5df2\u9a57\u8b49',
    },
    unknown: {
      bg: '#fff3cd',
      border: '#ffc107',
      color: '#856404',
      icon: '\u26a0\ufe0f',
      text: '\u672a\u77e5\u5bc4\u4ef6\u4eba',
    },
    danger: {
      bg: '#f8d7da',
      border: '#dc3545',
      color: '#721c24',
      icon: '\ud83d\uded1',
      text: '\u8b66\u544a\uff1a\u7591\u4f3c\u8a50\u9a19',
    },
  };

  let db = null;
  let stats = { safe: 0, unknown: 0, danger: 0 };

  /**
   * 初始化：載入 DB
   */
  async function init() {
    try {
      db = await DbLoader.load();
      console.log('[EmailFraudGuard] DB 載入完成，開始監聽 Gmail');
      startObserver();
      // 初始掃描
      scanEmails();
    } catch (err) {
      console.error('[EmailFraudGuard] 初始化失敗:', err);
    }
  }

  /**
   * 建立 Badge 元素
   */
  function createBadge(result) {
    const style = BADGE_STYLES[result.level];
    const badge = document.createElement('span');
    badge.setAttribute(BADGE_ATTR, 'true');
    badge.title = result.reason;
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin-left: 6px;
      padding: 1px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      line-height: 18px;
      background: ${style.bg};
      border: 1px solid ${style.border};
      color: ${style.color};
      cursor: help;
      vertical-align: middle;
      white-space: nowrap;
    `;
    badge.textContent = `${style.icon} ${style.text}`;
    return badge;
  }

  /**
   * 從元素中提取 email 和顯示名稱
   */
  function extractSenderInfo(element) {
    // 方法 1: data-hovercard-id 屬性（較穩定）
    const hovercardEl = element.querySelector('[data-hovercard-id]');
    if (hovercardEl) {
      const hovercardId = hovercardEl.getAttribute('data-hovercard-id');
      if (hovercardId && hovercardId.includes('@')) {
        return {
          email: hovercardId,
          displayName: hovercardEl.textContent?.trim() || '',
        };
      }
    }

    // 方法 2: email 屬性
    const emailAttrEl = element.querySelector('[email]');
    if (emailAttrEl) {
      return {
        email: emailAttrEl.getAttribute('email'),
        displayName: emailAttrEl.getAttribute('name') || emailAttrEl.textContent?.trim() || '',
      };
    }

    // 方法 3: 從文字內容用 regex 提取
    const text = element.textContent || '';
    const match = text.match(EMAIL_REGEX);
    if (match) {
      // 嘗試從 < > 角括號中找顯示名稱
      const angleMatch = text.match(/^(.+?)\s*<.*@/);
      return {
        email: match[0],
        displayName: angleMatch ? angleMatch[1].trim() : '',
      };
    }

    return null;
  }

  /**
   * 掃描頁面中的寄件人元素並加上 badge
   */
  function scanEmails() {
    if (!db) return;

    // Gmail 寄件人區域的常見選擇器
    const selectors = [
      // 信件列表中的寄件人
      'tr.zA .yW span[email]',
      // 開啟的信件中的寄件人
      '.gE.iv.gt span[email]',
      // 其他可能的寄件人元素
      '[data-hovercard-id]',
      'span[email]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        // 已經檢查過就跳過
        if (el.getAttribute(BADGE_ATTR) || el.parentElement?.querySelector(`[${BADGE_ATTR}]`)) {
          return;
        }

        let senderInfo = extractSenderInfo(el.closest('td, .gE, .go') || el.parentElement || el);
        if (!senderInfo) {
          // 如果無法從父元素提取，嘗試從元素本身
          const email = el.getAttribute('email') || el.getAttribute('data-hovercard-id');
          if (!email || !email.includes('@')) return;
          const displayName = el.getAttribute('name') || el.textContent?.trim() || '';
          senderInfo = { email, displayName };
        }

        if (!senderInfo?.email) return;

        const result = EmailChecker.check(senderInfo.displayName, senderInfo.email, db);

        // 插入 badge
        const badge = createBadge(result);
        el.after(badge);
        el.setAttribute(BADGE_ATTR, result.level);

        // 更新統計
        stats[result.level]++;
      });
    }

    // 儲存統計到 storage
    chrome.storage.local.set({ stats });
  }

  /**
   * 用 MutationObserver 監聽 Gmail DOM 變化
   */
  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // 只在有新節點加入時觸發掃描
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 檢查是否是信件相關的 DOM 變化
              if (node.querySelector?.('span[email]') ||
                  node.querySelector?.('[data-hovercard-id]') ||
                  node.matches?.('tr.zA') ||
                  node.querySelector?.('tr.zA')) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        // 延遲掃描，等 DOM 穩定
        clearTimeout(window.__efgScanTimeout);
        window.__efgScanTimeout = setTimeout(scanEmails, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // 啟動
  init();
})();
