import re
import json
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def extract_shop_id(shop_input):
    """Extract shop ID from URL or direct ID input."""
    shop_input = shop_input.strip()
    m = re.search(r'shop(\d+)', shop_input)
    if m:
        return m.group(1)
    if re.match(r'^\d+$', shop_input):
        return shop_input
    return None


def parse_g_config(html):
    """Extract window.g_config from page HTML using brace counting."""
    marker = 'window.g_config = '
    idx = html.find(marker)
    if idx == -1:
        return None

    start = idx + len(marker)
    if start >= len(html) or html[start] != '{':
        return None

    depth = 0
    for i in range(start, len(html)):
        ch = html[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                json_str = html[start:i+1]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    return None

    return None


def extract_fans_count(html):
    """Try to extract fans count from page content."""
    patterns = [
        r'"fansCount"\s*:\s*(\d+)',
        r'"fans"\s*:\s*(\d+)',
        r'"followerCount"\s*:\s*(\d+)',
        r'粉丝[：:]\s*(\d[\d,]*)',
        r'粉丝数[：:]\s*(\d[\d,]*)',
        r'"totalFollow"\s*:\s*(\d+)',
        r'"followCount"\s*:\s*(\d+)',
    ]
    for p in patterns:
        m = re.search(p, html)
        if m:
            return m.group(1).replace(',', '')
    return None


def extract_deposit(html):
    """Try to extract deposit amount from page content."""
    patterns = [
        r'保证金[：:]\s*(\d[\d,]*\.?\d*)\s*元',
        r'"deposit"\s*:\s*"(\d+)"',
        r'"deposit"\s*:\s*(\d+)',
        r'"bailAmount"\s*:\s*(\d+)',
        r'"bail"\s*:\s*(\d+)',
        r'"consumerProtection"\s*:.*?"bail"\s*:\s*(\d+)',
    ]
    for p in patterns:
        m = re.search(p, html)
        if m:
            return m.group(1).replace(',', '')
    return None


def extract_category(html):
    """Try to extract main category from page content."""
    patterns = [
        r'"categoryName"\s*:\s*"([^"]+)"',
        r'"mainCategory"\s*:\s*"([^"]+)"',
        r'"category"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"',
        r'主营类目[：:]\s*([^\s<]+)',
        r'主营[：:]\s*([^\s<]+)',
        r'"sellerCids"\s*:\s*\[(.*?)\]',
    ]
    for p in patterns:
        m = re.search(p, html)
        if m:
            return m.group(1).strip()
    return None


def credit_level_from_icon(icon_url):
    """Determine credit level text from icon URL."""
    if not icon_url:
        return '未知'
    if 'red' in icon_url or 'T1' in icon_url:
        return '红心'
    if 'blue' in icon_url or 'T2' in icon_url:
        return '蓝钻'
    if 'crown' in icon_url or 'T3' in icon_url:
        return '蓝冠'
    if 'gold' in icon_url or 'T4' in icon_url:
        return '金冠'
    m = re.search(r'T(\d)', icon_url)
    if m:
        return {'1': '红心', '2': '蓝钻', '3': '蓝冠', '4': '金冠'}.get(m.group(1), '未知')
    return '冠级'


def fetch_shop_data(shop_id, cookie=None):
    """Fetch and parse shop data from Taobao."""
    shop_url = f'https://shop{shop_id}.taobao.com/'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.taobao.com/',
    }
    if cookie:
        headers['Cookie'] = cookie

    resp = requests.get(shop_url, headers=headers, timeout=15, allow_redirects=True)
    html = resp.text

    g_config = parse_g_config(html)
    if not g_config:
        return {'success': False, 'error': '无法解析店铺页面数据，请确认店铺链接是否正确'}

    seller = g_config.get('seller', {})
    tmall = seller.get('tmall', g_config.get('bizType') == 'tmall')

    data = {
        'shopId': shop_id,
        'shopUrl': f'//shop{shop_id}.taobao.com',
        'shopName': seller.get('shopName', ''),
        'wangwang': seller.get('wangwang', seller.get('sellerNick', '')),
        'sellerId': seller.get('sellerId', ''),
        'shopDuration': seller.get('shopDuration', ''),
        'creditLevel': credit_level_from_icon(seller.get('creditLevelIcon', '')),
        'creditLevelDetail': '',
        'evaluates': [
            {
                'type': e.get('type', ''),
                'title': e.get('title', ''),
                'score': e.get('score', ''),
                'level': e.get('level', ''),
                'levelText': e.get('levelText', ''),
            }
            for e in seller.get('evaluates', [])
        ],
        'tmall': tmall,
        'fans': None,
        'deposit': None,
        'category': {'id': '', 'name': ''},
        'queryTime': datetime.now().strftime('%Y/%m/%d %H:%M:%S'),
    }

    if seller.get('evaluates') and len(seller.get('evaluates')) > 0:
        data['creditLevelDetail'] = seller['evaluates'][0].get('levelText', '')

    if cookie:
        data['fans'] = extract_fans_count(html)
        data['deposit'] = extract_deposit(html)
        cat = extract_category(html)
        if cat:
            data['category'] = {'id': '', 'name': cat}

        if not data['fans'] and not data['deposit'] and not data['category']['name']:
            data['note'] = '已使用Cookie但未从页面提取到附加数据，请确认Cookie有效性'
        else:
            data['note'] = None
    else:
        data['note'] = '部分数据（粉丝数、保证金、主营类目）需淘宝登录Cookie后才能获取'

    return {'success': True, 'data': data}


@app.route('/api/shop', methods=['GET'])
def api_shop():
    shop_name = request.args.get('shopName', '').strip()
    cookie = request.args.get('cookie', '').strip()

    if not shop_name:
        return jsonify({'success': False, 'error': '请输入店铺链接或店铺ID'})

    shop_id = extract_shop_id(shop_name)
    if not shop_id:
        return jsonify({'success': False, 'error': '无法识别店铺ID，请输入有效的店铺链接或店铺ID'})

    result = fetch_shop_data(shop_id, cookie=cookie if cookie else None)
    return jsonify(result)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, debug=True)
