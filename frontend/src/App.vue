<template>
  <div class="container">
    <header class="header">
      <h1>淘宝店铺信息查询</h1>
      <p class="subtitle">查询淘宝店铺公开信息</p>
    </header>

    <main class="main">
      <div class="search-section">
        <div class="search-box">
          <input
            v-model="shopName"
            type="text"
            placeholder="输入店铺链接或店铺ID (如: https://shop110318852.taobao.com)"
            class="search-input"
            @keyup.enter="searchShop"
          />
          <button
            class="search-btn"
            :disabled="loading || !shopName.trim()"
            @click="searchShop"
          >
            {{ loading ? '查询中...' : '查询' }}
          </button>
        </div>
      </div>

      <div class="cookie-section">
        <div class="cookie-toggle" @click="showCookie = !showCookie">
          <span class="toggle-icon">{{ showCookie ? '▼' : '▶' }}</span>
          <span>高级选项：使用淘宝Cookie查询登录数据</span>
          <span v-if="cookie" class="cookie-badge">已填写</span>
        </div>
        <div v-if="showCookie" class="cookie-input-area">
          <textarea
            v-model="cookie"
            placeholder="粘贴淘宝登录Cookie，用于查询粉丝数、保证金、主营类目等登录后可见数据。&#10;获取方式：浏览器F12 → Application → Cookies → 复制所有cookie"
            class="cookie-input"
          ></textarea>
          <p class="cookie-hint">
            提示：Cookie仅用于本次查询，不会存储到服务器。在淘宝页面按F12打开开发者工具，在Application/存储标签中复制Cookie值。
          </p>
        </div>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div class="contact-info">
        <span>作者微信：scmsj601</span>
        <span class="contact-divider">｜</span>
        <span>联系电话：18582478910</span>
      </div>

      <div v-if="shopData" class="result-card">
        <div class="result-header">
          <h2 class="result-title">查询结果</h2>
          <a v-if="shopData.shopUrl" :href="'https:' + shopData.shopUrl" target="_blank" class="shop-link">
            访问店铺
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>

        <div class="section-title">店铺基本信息</div>
        <div class="info-grid">
          <div class="info-item">
            <label>店铺名称</label>
            <span class="value">{{ shopData.shopName }}</span>
          </div>
          <div class="info-item">
            <label>旺旺名</label>
            <span class="value wangwang">{{ shopData.wangwang }}</span>
          </div>
          <div class="info-item">
            <label>店铺ID</label>
            <span class="value">{{ shopData.shopId }}</span>
          </div>
          <div class="info-item">
            <label>卖家ID</label>
            <span class="value">{{ shopData.sellerId }}</span>
          </div>
          <div class="info-item">
            <label>店铺类型</label>
            <span class="value" :class="shopData.tmall ? 'tmall' : 'taobao'">{{ shopData.tmall ? '天猫' : '淘宝' }}</span>
          </div>
        </div>

        <div class="section-title">店铺等级与评分</div>
        <div class="info-grid">
          <div class="info-item">
            <label>信用等级</label>
            <span class="value level-badge" :class="getLevelClass(shopData.creditLevel)">{{ shopData.creditLevel }}</span>
          </div>
          <div class="info-item">
            <label>开店时长</label>
            <span class="value duration">{{ shopData.shopDuration }}</span>
          </div>
        </div>

        <div v-if="shopData.evaluates && shopData.evaluates.length" class="score-grid">
          <div v-for="item in shopData.evaluates" :key="item.type" class="score-item">
            <div class="score-title">{{ item.title }}</div>
            <div class="score-value">{{ item.score }}</div>
            <div class="score-level" :class="item.level">{{ item.levelText }}</div>
          </div>
        </div>

        <div class="section-title login-required">登录后可见数据</div>
        <div class="info-grid">
          <div class="info-item">
            <label>粉丝数</label>
            <span v-if="shopData.fans" class="value fans">{{ shopData.fans }}</span>
            <span v-else class="value locked">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              需淘宝登录后查询
            </span>
          </div>
          <div class="info-item">
            <label>保证金</label>
            <span v-if="shopData.deposit" class="value deposit">¥{{ shopData.deposit }}</span>
            <span v-else class="value locked">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              需淘宝登录后查询
            </span>
          </div>
          <div class="info-item">
            <label>主营类目</label>
            <span v-if="shopData.category && shopData.category.name" class="value category">{{ shopData.category.name }}</span>
            <span v-else class="value locked">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              需淘宝登录后查询
            </span>
          </div>
        </div>

        <div class="info-note">
          <p v-if="shopData.note">{{ shopData.note }}</p>
          <p v-else>如数据为空，请提供有效的淘宝Cookie以获取登录后才可见的粉丝数、保证金、主营类目等数据。</p>
        </div>

        <div class="query-time">查询时间: {{ shopData.queryTime }}</div>
      </div>

      <div v-if="!shopData && !error" class="placeholder">
        <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p>输入店铺链接开始查询</p>
      </div>
    </main>

    <footer class="footer">
      <p>公开数据来源于淘宝店铺页面，部分数据需登录后可见。提供Cookie可查询粉丝数、保证金、主营类目。</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const shopName = ref('')
const shopData = ref(null)
const loading = ref(false)
const error = ref('')
const cookie = ref('')
const showCookie = ref(false)

const searchShop = async () => {
  if (!shopName.value.trim()) {
    error.value = '请输入店铺链接或店铺ID'
    return
  }

  loading.value = true
  error.value = ''
  shopData.value = null

  try {
    const params = new URLSearchParams({ shopName: shopName.value })
    if (cookie.value.trim()) {
      params.append('cookie', cookie.value.trim())
    }

    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
    const response = await fetch(`${apiBase}/shop?${params.toString()}`)
    const result = await response.json()

    if (result.success) {
      shopData.value = result.data
    } else {
      error.value = result.error || '查询失败，请稍后重试'
    }
  } catch (err) {
    error.value = '网络错误，请检查后端服务是否启动'
    console.error('查询失败:', err)
  } finally {
    loading.value = false
  }
}

const getLevelClass = (level) => {
  if (!level) return ''
  return level.toLowerCase()
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ff6b35 0%, #f7c948 100%);
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.header { text-align: center; margin-bottom: 2.5rem; }
.header h1 { font-size: 2rem; color: white; margin-bottom: 0.3rem; }
.subtitle { color: rgba(255, 255, 255, 0.9); font-size: 1rem; }

.main { max-width: 750px; margin: 0 auto; }

.search-section { margin-bottom: 1rem; }
.search-box {
  display: flex; gap: 0.75rem;
  background: white; padding: 0.75rem;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
.search-input {
  flex: 1; padding: 0.6rem 0.8rem;
  font-size: 0.95rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px; outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: #ff6b35; }
.search-btn {
  padding: 0.6rem 1.5rem; font-size: 0.95rem;
  font-weight: 600; color: white; background: #ff6b35;
  border: none; border-radius: 6px; cursor: pointer;
  transition: all 0.2s;
}
.search-btn:hover:not(:disabled) { background: #e55a2b; transform: translateY(-1px); }
.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.cookie-section {
  margin-bottom: 1rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
.cookie-toggle {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer; user-select: none;
  font-size: 0.9rem; color: #4a5568;
  transition: background 0.15s;
}
.cookie-toggle:hover { background: #f7fafc; }
.toggle-icon { font-size: 0.7rem; color: #a0aec0; }
.cookie-badge {
  font-size: 0.75rem; color: #38a169;
  background: #f0fff4; padding: 0.15rem 0.5rem;
  border-radius: 10px; margin-left: auto;
}
.cookie-input-area { padding: 0 1rem 1rem; }
.cookie-input {
  width: 100%; height: 100px; padding: 0.6rem;
  font-size: 0.85rem; font-family: monospace;
  border: 1px solid #e2e8f0; border-radius: 6px;
  resize: vertical; outline: none;
}
.cookie-input:focus { border-color: #ff6b35; }
.cookie-hint {
  font-size: 0.75rem; color: #a0aec0; margin-top: 0.4rem;
}

.error-msg { background: #fed7d7; color: #c53030; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; }

.contact-info { text-align: center; margin-bottom: 1rem; color: rgba(255,255,255,0.85); font-size: 0.8rem; }
.contact-divider { margin: 0 0.5rem; }

.result-card {
  background: white; padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.result-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1rem; padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}
.result-title { font-size: 1.2rem; color: #1a202c; }
.shop-link {
  display: flex; align-items: center; gap: 0.2rem;
  color: #ff6b35; text-decoration: none; font-weight: 500;
  font-size: 0.85rem; padding: 0.4rem 0.75rem;
  border-radius: 5px; border: 1px solid #ff6b35;
  transition: all 0.15s;
}
.shop-link:hover { background: #ff6b35; color: white; }

.section-title {
  font-size: 1rem; font-weight: 600; color: #1a202c;
  margin: 1.25rem 0 0.75rem; padding-bottom: 0.4rem;
  border-bottom: 2px solid #ff6b35;
}
.section-title.login-required {
  color: #a0aec0; border-bottom-color: #a0aec0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem; margin-bottom: 0.5rem;
}

.info-item { display: flex; flex-direction: column; gap: 0.3rem; }
.info-item label { font-size: 0.8rem; color: #718096; }
.info-item .value {
  font-size: 1rem; color: #1a202c; font-weight: 500;
}

.wangwang {
  font-family: "SFMono-Regular", Consolas, monospace;
  background: #f7fafc; padding: 0.2rem 0.4rem;
  border-radius: 3px; display: inline-block;
  font-size: 0.9rem;
}

.duration {
  background: #fefcbf; padding: 0.2rem 0.6rem;
  border-radius: 12px; font-size: 0.85rem;
  color: #975a16; display: inline-block;
}

.tmall { color: #e53e3e; font-weight: 700; }
.taobao { color: #ff6b35; font-weight: 700; }

.level-badge {
  display: inline-block; padding: 0.25rem 0.6rem;
  border-radius: 14px; font-size: 0.85rem;
}

.fans {
  color: #2b6cb0; font-weight: 600;
}
.deposit {
  color: #e53e3e; font-weight: 600;
}
.category {
  color: #2f855a; font-weight: 600;
}

.locked {
  color: #a0aec0 !important;
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.85rem;
}

.score-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem; margin-top: 0.75rem;
}
.score-item {
  text-align: center; padding: 0.75rem;
  background: #f7fafc; border-radius: 6px;
}
.score-title { font-size: 0.8rem; color: #718096; margin-bottom: 0.25rem; }
.score-value { font-size: 1.25rem; font-weight: 700; color: #ff6b35; margin-bottom: 0.15rem; }
.score-level { font-size: 0.7rem; }
.score-level.higher { color: #38a169; }
.score-level.mid { color: #d69e2e; }
.score-level.lower { color: #e53e3e; }

.info-note {
  margin-top: 1rem; padding: 0.5rem 0.75rem;
  background: #fffaf0; border-left: 3px solid #ed8936;
  border-radius: 4px; font-size: 0.8rem; color: #744210;
}

.query-time {
  margin-top: 1rem; padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.8rem; color: #a0aec0;
}

.placeholder { text-align: center; padding: 3rem 1.5rem; color: white; }
.placeholder-icon { width: 48px; height: 48px; margin-bottom: 0.75rem; opacity: 0.7; }
.placeholder p { font-size: 1.1rem; opacity: 0.9; }

.footer { text-align: center; margin-top: 2rem; color: rgba(255, 255, 255, 0.8); font-size: 0.8rem; }
</style>
