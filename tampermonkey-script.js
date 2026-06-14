// ==UserScript==
// @name         淘宝店铺数据提取器
// @namespace    https://github.com/user/taobao-shop-extractor
// @version      1.0
// @description  在淘宝店铺页面提取粉丝数、保证金、主营类目等数据
// @author       You
// @match        https://shop*.taobao.com/*
// @match        https://shop*.tmall.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function extractShopData() {
        const gConfig = window.g_config;
        if (!gConfig || !gConfig.seller) return null;

        const seller = gConfig.seller;

        // 提取粉丝数 - 从页面DOM中查找
        let fans = null;
        const fansEl = document.querySelector('[class*="fans"], [class*="follow"], [data-spm*="fans"]');
        if (fansEl) {
            const match = fansEl.textContent.match(/(\d[\d,]*)/);
            if (match) fans = match[1].replace(/,/g, '');
        }
        // 尝试从页面文本提取
        if (!fans) {
            const bodyText = document.body.innerText;
            const fm = bodyText.match(/粉丝[：:\s]*(\d[\d,]*)/);
            if (fm) fans = fm[1].replace(/,/g, '');
        }
        // 尝试从data属性提取
        if (!fans) {
            const dataEl = document.querySelector('[data-fans], [data-follow], [data-followers]');
            if (dataEl) {
                fans = dataEl.dataset.fans || dataEl.dataset.follow || dataEl.dataset.followers;
            }
        }

        // 提取保证金
        let deposit = null;
        const depositEl = document.querySelector('[class*="deposit"], [class*="bail"], [class*="guarantee"]');
        if (depositEl) {
            const match = depositEl.textContent.match(/(\d[\d,]*\.?\d*)/);
            if (match) deposit = match[1].replace(/,/g, '');
        }
        if (!deposit) {
            const bodyText = document.body.innerText;
            const dm = bodyText.match(/保证金[：:\s]*(\d[\d,]*\.?\d*)\s*元?/);
            if (dm) deposit = dm[1].replace(/,/g, '');
        }

        // 提取主营类目
        let category = { id: '', name: '' };
        const catEl = document.querySelector('[class*="category"], [class*="main-cat"], [class*="cate"]');
        if (catEl) {
            const text = catEl.textContent.trim();
            const cm = text.match(/主营[：:\s]*(.+)/);
            if (cm) category.name = cm[1].trim();
        }
        if (!category.name) {
            const bodyText = document.body.innerText;
            const cm2 = bodyText.match(/主营类目[：:\s]*(\S+)/);
            if (cm2) category.name = cm2[1];
        }
        if (!category.name) {
            const cm3 = bodyText.match(/主营[：:\s]*(\S+)/);
            if (cm3) category.name = cm3[1];
        }

        return {
            shopId: seller.shopId || '',
            shopName: seller.shopName || '',
            wangwang: seller.wangwang || seller.sellerNick || '',
            sellerId: seller.sellerId || '',
            shopDuration: seller.shopDuration || '',
            tmall: seller.tmall || gConfig.bizType === 'tmall',
            evaluates: seller.evaluates || [],
            fans: fans,
            deposit: deposit,
            category: category,
            queryTime: new Date().toLocaleString('zh-CN'),
        };
    }

    // 创建浮动面板
    function createPanel(data) {
        const existing = document.getElementById('taobao-extractor-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'taobao-extractor-panel';
        panel.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            width: 380px; max-height: 80vh; overflow-y: auto;
            background: white; border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 14px; color: #1a202c;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
            background: linear-gradient(135deg, #ff6b35, #f7c948);
            border-radius: 12px 12px 0 0; color: white;
        `;
        header.innerHTML = `
            <div>
                <div style="font-size:16px;font-weight:700;">店铺数据提取</div>
                <div style="font-size:12px;opacity:0.9;">${data.shopName}</div>
            </div>
            <button id="taobao-extractor-close" style="
                background:none;border:none;color:white;cursor:pointer;
                font-size:20px;line-height:1;padding:0;
            ">&times;</button>
        `;

        const body = document.createElement('div');
        body.style.cssText = 'padding: 16px 20px;';

        const sections = [
            { title: '基本信息', items: [
                { label: '店铺名称', value: data.shopName },
                { label: '旺旺名', value: data.wangwang },
                { label: '店铺ID', value: data.shopId },
                { label: '卖家ID', value: data.sellerId },
                { label: '店铺类型', value: data.tmall ? '天猫' : '淘宝' },
            ]},
            { title: '等级与评分', items: [
                { label: '开店时长', value: data.shopDuration },
                ...data.evaluates.map(e => ({
                    label: e.title, value: `${e.score}分 ${e.levelText}`
                })),
            ]},
            { title: '登录可见数据', highlight: true, items: [
                { label: '粉丝数', value: data.fans || '未获取到' },
                { label: '保证金', value: data.deposit ? `¥${data.deposit}` : '未获取到' },
                { label: '主营类目', value: data.category?.name || '未获取到' },
            ]},
        ];

        sections.forEach(section => {
            const title = document.createElement('div');
            title.style.cssText = `
                font-weight: 600; font-size: 13px; color: ${section.highlight ? '#e53e3e' : '#1a202c'};
                margin: 16px 0 8px; padding-bottom: 4px;
                border-bottom: 2px solid ${section.highlight ? '#fc8181' : '#ff6b35'};
            `;
            title.textContent = section.title;
            body.appendChild(title);

            section.items.forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = `
                    display: flex; justify-content: space-between;
                    padding: 6px 0;
                `;
                row.innerHTML = `
                    <span style="color:#718096;font-size:13px;">${item.label}</span>
                    <span style="font-weight:500;color:${section.highlight && item.value !== '未获取到' ? '#38a169' : '#1a202c'};">${item.value}</span>
                `;
                body.appendChild(row);
            });
        });

        const copyBtn = document.createElement('button');
        copyBtn.style.cssText = `
            width: 100%; margin-top: 16px; padding: 8px;
            background: #ff6b35; color: white; border: none;
            border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;
        `;
        copyBtn.textContent = '复制数据到剪贴板';
        copyBtn.onclick = () => {
            const json = JSON.stringify(data, null, 2);
            navigator.clipboard.writeText(json).then(() => {
                copyBtn.textContent = '已复制!';
                setTimeout(() => copyBtn.textContent = '复制数据到剪贴板', 1500);
            });
        };
        body.appendChild(copyBtn);

        panel.appendChild(header);
        panel.appendChild(body);
        document.body.appendChild(panel);

        document.getElementById('taobao-extractor-close').onclick = () => panel.remove();
    }

    // 等待页面加载完成后提取数据
    function init() {
        setTimeout(() => {
            const data = extractShopData();
            if (data) {
                createPanel(data);
            }
        }, 2000);

        // 再次尝试（页面动态加载完成后）
        setTimeout(() => {
            const data = extractShopData();
            if (data) {
                createPanel(data);
            }
        }, 5000);
    }

    init();
})();
