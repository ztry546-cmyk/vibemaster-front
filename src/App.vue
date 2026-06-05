<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import tSdk from '@twa-dev/sdk'

// Импортируем наши новые чистые модули
import ProfileTab from './components/ProfileTab.vue'
import ShopTab from './components/ShopTab.vue'
import GroupsTab from './components/GroupsTab.vue'
import BusinessManager from './components/BusinessManager.vue'

const WebApp = tSdk.default || tSdk

axios.defaults.baseURL = import.meta.env.VITE_API_URL
axios.defaults.headers.common['Authorization'] = WebApp?.initData || ''

const user = ref({ coins: 0, karma: 0, crystals: 0, is_vip: 0, job_id: null, job_chat_id: null, job_chat_title: null, prefix: null })
const activeTab = ref('profile') 
const error = ref('')
const isLoading = ref(true)

const tgUserId = WebApp?.initDataUnsafe?.user?.id || Number(import.meta.env.VITE_ADMIN_ID) || 123456789

const jobsMap = {
  cleaner: "Дворник 🧹",
  cashier: "Кассир 🛒",
  freelancer: "Фрилансер 👨‍💻",
  blogger: "Блогер 📸",
  manager: "Топ-менеджер 👔 [PREMIUM]",
  crypto_whale: "Крипто-кит 🐳 [PREMIUM]",
  ceo: "Генеральный директор 👑 [PREMIUM]",
  oligarch: "Олигарх 💎 [VIP]"
}

// Глобальная загрузка профиля (используется во всех вкладках после покупок)
const fetchUser = async () => {
  try {
    const res = await axios.get(`/api/user/${tgUserId}`)
    user.value = res.data
  } catch (err) {
    error.value = 'Ошибка загрузки профиля. Проверьте подключение к API.'
  }
}

const quitJob = async () => {
  try {
    await axios.post('/api/quit-job')
    WebApp?.showAlert('Вы успешно уволились! Теперь вы свободны.')
    WebApp?.HapticFeedback?.notificationOccurred('success')
    await fetchUser()
  } catch (e) {
    WebApp?.showAlert(e.response?.data?.error || 'Ошибка увольнения')
  }
}

const loadApp = async () => {
  isLoading.value = true
  try {
    await fetchUser()
  } catch (e) {
    error.value = 'Критическая ошибка инициализации'
  } finally {
    isLoading.value = false
  }
}

const handleBalanceUpdate = (newBalance) => {
  user.value.coins = newBalance
}

onMounted(() => {
  if (WebApp && typeof WebApp.ready === 'function') {
    WebApp.ready()
    WebApp.expand()
  }
  loadApp()
})
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>VibeMaster</h1>
      <p class="subtitle">
        {{ activeTab === 'profile' ? 'Личный кабинет' : (activeTab === 'shop' ? 'Магазин' : (activeTab === 'businesses' ? 'Доход и Бизнес' : 'Управление чатами')) }}
      </p>
    </header>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Синхронизация данных...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="content-area">
      
      <ProfileTab 
        v-if="activeTab === 'profile'" 
        :user="user" 
        @refresh-user="fetchUser" 
      />

      <div v-if="activeTab === 'businesses'" class="businesses-module">
        <div class="job-section-card">
          <span class="job-label">Текущая занятость</span>
          <div class="job-value">
            {{ user.job_id ? jobsMap[user.job_id] : "Безработный 😴" }}
          </div>
          <p class="job-subtext">
            {{ user.job_id ? `Группа: ${user.job_chat_title || user.job_chat_id || 'Неизвестно'}` : "Устроиться можно в чате: вм профессии" }}
          </p>
          <button v-if="user.job_id" @click="quitJob" class="danger-btn mt-10">Уволиться по собственному</button>
        </div>

        <BusinessManager 
          :tg-user-id="tgUserId" 
          @update-balance="handleBalanceUpdate"
        />
      </div>

      <ShopTab 
        v-if="activeTab === 'shop'" 
        :user="user" 
        @refresh-user="fetchUser" 
      />

      <GroupsTab 
        v-if="activeTab === 'chats'" 
        :tgUserId="tgUserId" 
      />

    </div>

    <nav class="bottom-nav">
      <button class="nav-item" :class="{ active: activeTab === 'profile' }" @click="activeTab = 'profile'">Профиль</button>
      <button class="nav-item" :class="{ active: activeTab === 'businesses' }" @click="activeTab = 'businesses'">Доход 💸</button>
      <button class="nav-item" :class="{ active: activeTab === 'shop' }" @click="activeTab = 'shop'">Магазин</button>
      <button class="nav-item" :class="{ active: activeTab === 'chats' }" @click="activeTab = 'chats'">Группы</button>
    </nav>
  </div>
</template>

<style>
/* ГЛОБАЛЬНЫЕ СТИЛИ
  Не используем scoped, чтобы дочерние компоненты (Profile, Shop, Groups)
  наследовали все эти классы и выглядели в едином стиле.
*/
:root {
  --bg-main: #0f0f13;
  --bg-card: #1c1c24;
  --text-main: #ffffff;
  --text-muted: #8e8e93;
  --accent: #0a84ff;
  --border-color: rgba(255, 255, 255, 0.08);
  --vip-glow: #bf5af2;
  --success: #34c759;
  --danger: #ff453a;
}

body {
  background-color: var(--bg-main);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

.app-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 20px 100px;
  min-height: 100vh;
  box-sizing: border-box;
  position: relative;
}

.header { text-align: center; margin-bottom: 32px; }
.header h1 { margin: 0; font-size: 32px; font-weight: 800; background: linear-gradient(90deg, #ffffff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { margin: 6px 0 0; font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }

.cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.stat-card, .settings-card, .job-section-card { background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; padding: 24px 20px; }
.stat-card { display: flex; flex-direction: column; gap: 12px; }
.job-section-card { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
.settings-card { margin-bottom: 16px; }
.settings-card h3 { margin: 0 0 16px 0; font-size: 18px; color: var(--accent); }

.crystal-card { background: linear-gradient(145deg, rgba(28,28,36,1) 0%, rgba(191,90,242,0.1) 100%); border: 1px solid rgba(191,90,242,0.3); }

.prefix-display { background: rgba(10, 132, 255, 0.1); border: 1px solid rgba(10, 132, 255, 0.3); border-radius: 16px; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.prefix-value { font-weight: bold; color: var(--accent); font-size: 18px; }
.job-label, .stat-label { font-size: 14px; color: var(--text-muted); font-weight: 500; }
.job-value { font-size: 20px; font-weight: 700; color: #0a84ff; }
.job-subtext, .price-preview { font-size: 12px; color: var(--text-muted); }
.shop-desc { font-size: 14px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4; }

.stat-value-container { display: flex; align-items: baseline; gap: 6px; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--text-main); }
.currency { font-size: 13px; color: var(--text-muted); font-weight: 600; }

.exchange-preview { background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 12px; text-align: center; font-weight: bold; margin-bottom: 16px; display: flex; justify-content: space-around; }

.buy-btn, .save-btn { width: 100%; background-color: var(--accent); color: #ffffff; border: none; border-radius: 18px; padding: 20px 24px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.save-btn { background-color: var(--success); justify-content: center; }
.buy-btn:disabled, .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.text-center-btn { justify-content: center; gap: 12px; }

.danger-btn { background-color: rgba(255, 69, 58, 0.1); color: var(--danger); border: 1px solid rgba(255, 69, 58, 0.3); border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; text-align: center; }
.mt-10 { margin-top: 10px; } .mb-10 { margin-bottom: 10px; } .mb-0 { margin-bottom: 0px !important; }

/* Стили Донат-Пакетов */
.crystal-packs { display: flex; flex-direction: column; gap: 12px; }
.pack-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; color: white; cursor: pointer; position: relative; overflow: hidden; transition: 0.2s; }
.pack-btn:active { transform: scale(0.98); }
.pack-amount { font-size: 18px; font-weight: 700; color: #fff; }
.pack-price { font-size: 16px; font-weight: 600; color: var(--text-muted); }
.pack-pro { border-color: rgba(191,90,242,0.4); background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(191,90,242,0.1) 100%); }
.pack-pro .pack-price { color: var(--vip-glow); }
.pack-magnat { border-color: rgba(255,159,10,0.5); background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,159,10,0.15) 100%); }
.pack-magnat .pack-price { color: #ff9f0a; }
.pack-badge { position: absolute; top: 0; right: 0; background: var(--vip-glow); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-bottom-left-radius: 12px; }
.pack-badge-magnat { background: #ff9f0a; color: #000; }

.ui-slider { -webkit-appearance: none; width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; outline: none; margin: 15px 0; }
.ui-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 0 10px rgba(10, 132, 255, 0.5); }

.vip-active-card { background: linear-gradient(135deg, rgba(191, 90, 242, 0.12) 0%, rgba(94, 92, 230, 0.12) 100%); border: 1px solid rgba(191, 90, 242, 0.25); border-radius: 18px; padding: 22px 24px; display: flex; justify-content: space-between; align-items: center; }
.vip-title { font-weight: 600; color: #ffffff; font-size: 16px; }
.vip-status { font-size: 14px; font-weight: 700; color: var(--vip-glow); text-transform: uppercase; }

.chat-list { display: flex; flex-direction: column; gap: 12px; }
.chat-item { background-color: var(--bg-card); padding: 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color); cursor: pointer; }
.chat-title { font-weight: 500; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%; }
.chat-item-meta { display: flex; align-items: center; gap: 8px; }
.premium-badge-mini { background-color: rgba(191, 90, 242, 0.15); color: var(--vip-glow); font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(191, 90, 242, 0.3); }

.status-active { color: var(--success); font-weight: 600; }
.status-expired { color: var(--danger); font-weight: 600; }
.back-btn { background: none; border: none; color: var(--text-muted); font-size: 16px; padding: 0 0 16px 0; cursor: pointer; }

.setting-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ui-select, .ui-input { width: 100%; box-sizing: border-box; background-color: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: white; padding: 12px 14px; border-radius: 10px; outline: none; }
.setting-row .ui-select { width: auto; }
.ui-select:disabled, .ui-input:disabled { opacity: 0.6; cursor: not-allowed; }

.add-word-row { display: flex; gap: 8px; margin-bottom: 16px; }
.add-btn { background-color: var(--accent); border: none; border-radius: 10px; color: white; font-size: 20px; width: 48px; }
.words-list { display: flex; flex-wrap: wrap; gap: 8px; }
.word-chip { background-color: rgba(255, 255, 255, 0.1); padding: 6px 12px; border-radius: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.remove-word { color: #ff453a; cursor: pointer; font-weight: bold; }

.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background-color: rgba(28, 28, 36, 0.9); backdrop-filter: blur(10px); display: flex; padding: 16px 20px 24px; border-top: 1px solid var(--border-color); gap: 8px; z-index: 100; }
.nav-item { flex: 1; background: transparent; border: none; color: var(--text-muted); font-size: 13px; font-weight: 600; padding: 12px 4px; border-radius: 12px; transition: all 0.2s; }
.nav-item.active { background-color: rgba(10, 132, 255, 0.1); color: var(--accent); }

.loading-state, .error-state, .empty-state { text-align: center; padding: 60px 0; color: var(--text-muted); }
.error-state { color: #ff453a; background: rgba(255, 69, 58, 0.1); border-radius: 16px; padding: 20px; border: 1px solid rgba(255, 69, 58, 0.2); }
.spinner { width: 36px; height: 36px; border: 3px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>