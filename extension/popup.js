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

function renderData(data) {
  var empty = document.getElementById('emptyState');
  var view = document.getElementById('dataView');
  var status = document.getElementById('statusBar');

  if (!data || data.error) {
    empty.style.display = 'block';
    view.style.display = 'none';
    status.textContent = data ? data.error : '无数据';
    return;
  }

  empty.style.display = 'none';
  view.style.display = 'block';

  var levelText = creditLevelText(data.creditLevelIcon);

  var html = '';

  // 基本信息
  html += '<div class="section-title">基本信息</div>';
  html += row('店铺名称', data.shopName || '-');
  html += row('旺旺名', data.wangwang || '-');
  html += row('店铺ID', data.shopId || '-');
  html += row('卖家ID', data.sellerId || '-');
  html += row('开店时长', data.shopDuration || '-');
  html += row('店铺类型', data.tmall ? '<span class="badge-tmall">天猫</span>' : '<span class="badge-taobao">淘宝</span>');
  html += row('信用等级', levelText || '-');

  // 评分
  if (data.evaluates && data.evaluates.length > 0) {
    html += '<div class="section-title">动态评分</div>';
    for (var i = 0; i < data.evaluates.length; i++) {
      var e = data.evaluates[i];
      html += '<div class="score-row">' +
        '<span class="score-title">' + (e.title || '') + '</span>' +
        '<span class="score-val">' + (e.score || '') + '</span>' +
        '<span class="score-level ' + (e.level || '') + '">' + (e.levelText || '') + '</span>' +
        '</div>';
    }
  }

  // 登录可见数据
  html += '<div class="section-title login">登录可见数据<span> (当前页面提取)</span></div>';
  html += row('粉丝数', data.fans, true);
  html += row('保证金', data.deposit ? '¥' + data.deposit : null, true);
  html += row('主营类目', (data.category && data.category.name) ? data.category.name : null, true);

  // 更新时间
  html += '<div style="text-align:center;margin-top:12px;font-size:10px;color:#cbd5e0;">提取时间: ' + (data.queryTime || '') + '</div>';

  view.innerHTML = html;

  var isOnShop = data.shopId ? true : false;
  status.textContent = isOnShop ? '已提取店铺数据' : '请在淘宝店铺页面使用';
}

function row(label, value, highlight) {
  var hasVal = value && value !== '-' && value !== 'null';
  var valClass = highlight
    ? (hasVal ? 'value-found' : 'value-empty')
    : '';
  var displayVal = hasVal ? value : (highlight ? '未获取到' : (value || '-'));
  return '<div class="row">' +
    '<span class="label">' + label + '</span>' +
    '<span class="value ' + valClass + '">' + displayVal + '</span>' +
    '</div>';
}

function loadData() {
  chrome.storage.local.get(['shopData', 'lastUpdate'], function(result) {
    if (result.shopData) {
      renderData(result.shopData);
    }

    // 尝试向当前tab的content script请求最新数据
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs[0]) return;

      var tab = tabs[0];
      var url = tab.url || '';

      // 检查是否在淘宝店铺页面
      if (/shop\d*\.(taobao|tmall)\.com/.test(url)) {
        chrome.tabs.sendMessage(tab.id, { action: 'getData' }, function(response) {
          if (chrome.runtime.lastError) {
            // content script 可能还没加载，使用 storage 中的数据
            if (!result.shopData) {
              renderData(null);
            }
            return;
          }
          if (response && !response.error) {
            renderData(response);
          }
        });
      }
    });
  });
}

// 刷新按钮
document.getElementById('btnRefresh').addEventListener('click', function() {
  var btn = this;
  btn.textContent = '提取中...';
  btn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0]) {
      btn.textContent = '重新提取';
      btn.disabled = false;
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: 'getData' }, function(response) {
      btn.textContent = '重新提取';
      btn.disabled = false;

      if (chrome.runtime.lastError) {
        document.getElementById('statusBar').textContent = '请在淘宝店铺页面点击此图标';
        return;
      }
      if (response && !response.error) {
        renderData(response);
        document.getElementById('statusBar').textContent = '数据已更新';
      }
    });
  });
});

// 复制按钮
document.getElementById('btnCopy').addEventListener('click', function() {
  chrome.storage.local.get(['shopData'], function(result) {
    if (!result.shopData || result.shopData.error) {
      document.getElementById('statusBar').textContent = '无数据可复制';
      return;
    }

    var d = result.shopData;
    var text = [
      '店铺名称: ' + (d.shopName || '-'),
      '旺旺名: ' + (d.wangwang || '-'),
      '店铺ID: ' + (d.shopId || '-'),
      '卖家ID: ' + (d.sellerId || '-'),
      '开店时长: ' + (d.shopDuration || '-'),
      '店铺类型: ' + (d.tmall ? '天猫' : '淘宝'),
      '信用等级: ' + creditLevelText(d.creditLevelIcon),
      '',
      '--- 动态评分 ---',
    ];

    if (d.evaluates) {
      d.evaluates.forEach(function(e) {
        text.push(e.title + ': ' + e.score + '分 ' + e.levelText);
      });
    }

    text.push('');
    text.push('--- 登录可见数据 ---');
    text.push('粉丝数: ' + (d.fans || '未获取到'));
    text.push('保证金: ' + (d.deposit ? '¥' + d.deposit : '未获取到'));
    text.push('主营类目: ' + ((d.category && d.category.name) || '未获取到'));
    text.push('');
    text.push('提取时间: ' + (d.queryTime || ''));

    navigator.clipboard.writeText(text.join('\n')).then(function() {
      var toast = document.getElementById('copyToast');
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 1500);
      document.getElementById('statusBar').textContent = '已复制到剪贴板';
    });
  });
});

// 初始加载
document.addEventListener('DOMContentLoaded', loadData);
