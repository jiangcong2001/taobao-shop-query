chrome.runtime.onInstalled.addListener(function() {
  console.log('淘宝店铺数据查询插件已安装');
});

chrome.action.onClicked.addListener(function(tab) {
  // Popup 会自动打开，这里做额外检查
});
