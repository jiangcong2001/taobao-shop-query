function extractShopData() {
  const gConfig = window.g_config;
  if (!gConfig || !gConfig.seller) {
    return { error: '未检测到淘宝店铺页面' };
  }

  const seller = gConfig.seller;

  // --- 基础数据 (来自 g_config) ---
  const data = {
    shopId: seller.shopId || '',
    shopName: seller.shopName || '',
    shopUrl: seller.pcShopUrl || '',
    wangwang: seller.wangwang || seller.sellerNick || '',
    sellerId: seller.sellerId || '',
    shopDuration: seller.shopDuration || '',
    tmall: seller.tmall || gConfig.bizType === 'tmall',
    creditLevelIcon: seller.creditLevelIcon || '',
    evaluates: (seller.evaluates || []).map(function(e) {
      return {
        type: e.type,
        title: e.title,
        score: e.score,
        level: e.level,
        levelText: e.levelText
      };
    }),
    fans: null,
    deposit: null,
    category: { id: '', name: '' },
    queryTime: new Date().toLocaleString('zh-CN')
  };

  // --- 粉丝数 ---
  data.fans = findFansCount();

  // --- 保证金 ---
  data.deposit = findDeposit();

  // --- 主营类目 ---
  data.category = findCategory();

  return data;
}

function findFansCount() {
  var selectors = [
    '[class*="fans"]',
    '[class*="follow"]',
    '[class*="Fans"]',
    '[class*="Follow"]',
    '[data-spm*="fans"]',
    '[data-spm*="follow"]',
    '.shop-header-fans',
    '.header-info-fans',
    '.seller-fans',
    '.shop-fans',
    '[data-name="fans"]',
    '[data-name="followers"]'
  ];

  for (var i = 0; i < selectors.length; i++) {
    var els = document.querySelectorAll(selectors[i]);
    for (var j = 0; j < els.length; j++) {
      var text = els[j].textContent || '';
      var match = text.match(/([\d,]+)/);
      if (match) {
        return match[1].replace(/,/g, '');
      }
    }
  }

  // 全页面文本搜索
  var bodyText = document.body.innerText || '';
  var patterns = [
    /粉丝[：:\s]*(\d[\d,]*)/,
    /粉丝数[：:\s]*(\d[\d,]*)/,
    /关注[者]?[：:\s]*(\d[\d,]*)/,
    /fans?[：:\s]*(\d[\d,]*)/i,
    /followers?[：:\s]*(\d[\d,]*)/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = bodyText.match(patterns[i]);
    if (m) return m[1].replace(/,/g, '');
  }

  // data属性搜索
  var allEls = document.querySelectorAll('[data-fans], [data-followers], [data-follow-count], [data-fans-count]');
  for (var i = 0; i < allEls.length; i++) {
    var val = allEls[i].dataset.fans || allEls[i].dataset.followers || allEls[i].dataset.followCount || allEls[i].dataset.fansCount;
    if (val) return String(val).replace(/,/g, '');
  }

  // 尝试从页面属性中找
  var allDataEls = document.querySelectorAll('[class*="num"], [class*="count"], [class*="Num"], [class*="Count"]');
  for (var i = 0; i < allDataEls.length; i++) {
    var parent = allDataEls[i].parentElement;
    if (parent) {
      var parentText = parent.textContent || '';
      if (/粉|follow/i.test(parentText)) {
        var m2 = parentText.match(/([\d,]+)/);
        if (m2) return m2[1].replace(/,/g, '');
      }
    }
  }

  return null;
}

function findDeposit() {
  var bodyText = document.body.innerText || '';

  var patterns = [
    /保证金[：:\s]*(\d[\d,.]*)\s*元?/,
    /消费者保障[：:\s]*(\d[\d,.]*)/,
    /保障金[：:\s]*(\d[\d,.]*)/,
    /deposit[：:\s]*(\d[\d,.]*)/i,
    /bail[：:\s]*(\d[\d,.]*)/i,
    /保证金\s+(\d[\d,.]*)/,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = bodyText.match(patterns[i]);
    if (m) return m[1].replace(/,/g, '');
  }

  var selectors = [
    '[class*="deposit"]',
    '[class*="bail"]',
    '[class*="Deposit"]',
    '[class*="Bail"]',
    '[class*="guarantee"]',
    '[class*="Guarantee"]',
    '.shop-guarantee',
    '.seller-guarantee'
  ];

  for (var i = 0; i < selectors.length; i++) {
    var els = document.querySelectorAll(selectors[i]);
    for (var j = 0; j < els.length; j++) {
      var text = els[j].textContent || '';
      var m2 = text.match(/(\d[\d,.]*)\s*元?/);
      if (m2) return m2[1].replace(/,/g, '');
    }
  }

  return null;
}

function findCategory() {
  var bodyText = document.body.innerText || '';

  var patterns = [
    /主营类目[：:\s]*(\S+)/,
    /主营[：:\s]*(\S+)/,
    /主要经营[：:\s]*(\S+)/,
    /店铺类目[：:\s]*(\S+)/,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = bodyText.match(patterns[i]);
    if (m) return { id: '', name: m[1].trim() };
  }

  var selectors = [
    '[class*="main-cat"]',
    '[class*="mainCat"]',
    '[class*="MainCat"]',
    '[class*="main-category"]',
    '[class*="shop-category"]',
    '.shop-category',
    '.seller-category',
    '.header-category',
    '[class*="sellerCids"]',
    '.main-business'
  ];

  for (var i = 0; i < selectors.length; i++) {
    var els = document.querySelectorAll(selectors[i]);
    for (var j = 0; j < els.length; j++) {
      var text = els[j].textContent || '';
      text = text.trim();
      if (text && text.length < 100) {
        return { id: '', name: text };
      }
    }
  }

  // 从页面 nav/breadcrumb 推断
  var navEls = document.querySelectorAll('[class*="nav"], [class*="Nav"], [class*="breadcrumb"], [class*="Breadcrumb"]');
  for (var i = 0; i < navEls.length; i++) {
    var text = navEls[i].textContent || '';
    var m2 = text.match(/所有分类[：:\s]*(\S+)/);
    if (m2) return { id: '', name: m2[1].trim() };
  }

  return { id: '', name: '' };
}

function creditLevelText(iconUrl) {
  if (!iconUrl) return '';
  if (iconUrl.indexOf('red') > -1 || iconUrl.indexOf('T1') > -1) return '红心';
  if (iconUrl.indexOf('blue') > -1 || iconUrl.indexOf('T2') > -1) return '蓝钻';
  if (iconUrl.indexOf('crown') > -1 || iconUrl.indexOf('T3') > -1) return '蓝冠';
  if (iconUrl.indexOf('gold') > -1 || iconUrl.indexOf('T4') > -1) return '金冠';
  var m = iconUrl.match(/T(\d)/);
  if (m) {
    var levels = { '1': '红心', '2': '蓝钻', '3': '蓝冠', '4': '金冠' };
    return levels[m[1]] || '冠级';
  }
  return '冠级';
}

// 提取数据并存储
function extractAndStore() {
  var data = extractShopData();
  chrome.storage.local.set({ shopData: data, lastUpdate: Date.now() }, function() {
    console.log('淘宝店铺数据已提取', data);
  });
}

// 页面加载完成后提取
setTimeout(extractAndStore, 2000);
setTimeout(extractAndStore, 5000);

// 监听 popup 的请求
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getData') {
    var data = extractShopData();
    chrome.storage.local.set({ shopData: data, lastUpdate: Date.now() });
    sendResponse(data);
  }
  return true;
});
