<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import tSdk from '@twa-dev/sdk'

const WebApp = tSdk.default || tSdk

const props = defineProps({
  tgUserId: {
    type: Number,
    required: true
  }
})

const chats = ref([])
const selectedChat = ref(null)
const newWord = ref('')
const isLoading = ref(true)

// Стейт для AFK модуля
const afkUsers = ref([])
const isAfkLoading = ref(false)
const afkSearched = ref(false)

const isChatPremium = (chat) => chat && chat.premium_until > Date.now()
const formatPremiumDate = (timestamp) => timestamp ? new Date(timestamp).toLocaleDateString('ru-RU') : 'Нет данных'

const fetchChats = async () => {
  isLoading.value = true
  try {
    const res = await axios.get(`/api/chats/${props.tgUserId}`)
    chats.value = res.data
    // Обновляем выбранный чат, если он открыт
    if (selectedChat.value) {
      selectedChat.value = chats.value.find(c => c.chat_id === selectedChat.value.chat_id)
    }
  } catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

const buyChatPremium = async () => {
  if (!selectedChat.value) return
  try {
    const res = await axios.post('/api/create-chat-invoice', { chat_id: selectedChat.value.chat_id })
    if (res.data.invoiceLink) {
      WebApp?.openInvoice(res.data.invoiceLink, async (status) => {
        if (status === 'paid') {
          WebApp?.showAlert('Premium подписка для чата успешно оформлена!')
          await fetchChats()
        }
      })
    }
  } catch (err) {
    WebApp?.showAlert('Не удалось сгенерировать чек')
  }
}

// АВТОСОХРАНЕНИЕ: Вызывается при любом изменении ползунков и селектов
const saveChatSettings = async () => {
  try {
    await axios.post('/api/update-chat', {
      chat_id: selectedChat.value.chat_id,
      antimat_enabled: selectedChat.value.antimat_enabled,
      punishment_type: selectedChat.value.punishment_type,
      mute_duration: selectedChat.value.mute_duration,
      anti_link: selectedChat.value.anti_link,
      anti_forward: selectedChat.value.anti_forward,
      anti_raid_days: selectedChat.value.anti_raid_days || 0
    })
    // Даем приятный тактильный отклик (вибрацию) при автосохранении вместо бесящего popup'а
    WebApp?.HapticFeedback?.notificationOccurred('success')
  } catch (err) {
    WebApp?.showAlert('Ошибка автосохранения настроек')
  }
}

const addBadWord = async () => {
  if (!newWord.value.trim()) return
  try {
    await axios.post('/api/bad-words', { chat_id: selectedChat.value.chat_id, word: newWord.value.trim().toLowerCase() })
    if (!selectedChat.value.bad_words) selectedChat.value.bad_words = []
    selectedChat.value.bad_words.push(newWord.value.trim().toLowerCase())
    newWord.value = ''
    WebApp?.HapticFeedback?.impactOccurred('light')
  } catch (err) {
    WebApp?.showAlert('Ошибка добавления')
  }
}

const removeBadWord = async (word) => {
  try {
    await axios.post('/api/bad-words/delete', { chat_id: selectedChat.value.chat_id, word: word })
    selectedChat.value.bad_words = selectedChat.value.bad_words.filter(w => w !== word)
    WebApp?.HapticFeedback?.impactOccurred('light')
  } catch (err) {
    WebApp?.showAlert('Ошибка удаления')
  }
}

// === МОДУЛЬ AFK ===
const loadAfkUsers = async () => {
  isAfkLoading.value = true
  afkSearched.value = true
  try {
    const res = await axios.get(`/api/chats/${selectedChat.value.chat_id}/afk`)
    afkUsers.value = res.data
  } catch (err) {
    WebApp?.showAlert('Ошибка поиска неактивных участников')
  } finally {
    isAfkLoading.value = false
  }
}

const kickAfkUsers = async () => {
  WebApp?.showConfirm(`Вы уверены, что хотите кикнуть ${afkUsers.value.length} неактивных участников?`, async (agreed) => {
    if (!agreed) return;
    
    try {
      const res = await axios.post(`/api/chats/${selectedChat.value.chat_id}/kick-afk`)
      WebApp?.showAlert(`✅ Успешно кикнуто: ${res.data.kicked} мертвых душ.`)
      afkUsers.value = []
      afkSearched.value = false
    } catch (e) {
      WebApp?.showAlert('Ошибка при кике участников')
    }
  });
}

onMounted(() => {
  fetchChats()
})
</script>

<template>
  <div class="chats-module">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Синхронизация чатов...</p>
    </div>

    <div v-else-if="!selectedChat" class="fade-in">
      <div v-if="chats.length === 0" class="empty-state">
        <span class="empty-icon">🤖</span>
        <p>Бот пока не добавлен ни в одну вашу группу.</p>
        <span class="empty-hint">Добавьте бота в чат и выдайте права администратора!</span>
      </div>
      
      <div v-else class="chat-list">
        <h2 class="section-title">Ваши группы</h2>
        <div v-for="chat in chats" :key="chat.chat_id" class="chat-item" @click="selectedChat = chat; afkSearched = false; afkUsers = []">
          <div class="chat-info">
            <div class="chat-avatar">{{ (chat.title || 'G').charAt(0).toUpperCase() }}</div>
            <div class="chat-details">
              <span class="chat-title">{{ chat.title || `Группа ID: ${chat.chat_id}` }}</span>
              <span class="chat-id">ID: {{ chat.chat_id }}</span>
            </div>
          </div>
          <div class="chat-item-meta">
            <span v-if="isChatPremium(chat)" class="badge badge-premium">Premium ⭐</span>
            <span v-else class="badge badge-free">Free</span>
            <span class="chevron">›</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="chat-settings fade-in">
      <div class="header-nav">
        <button class="back-btn" @click="selectedChat = null">
          <span class="icon">‹</span> Назад к списку
        </button>
        <span class="current-chat-title">{{ selectedChat.title || 'Настройки' }}</span>
      </div>
      
      <div class="settings-card premium-management-card">
        <div class="card-header">
          <h3>💎 Premium статус</h3>
          <span :class="['badge', isChatPremium(selectedChat) ? 'badge-active' : 'badge-expired']">
            {{ isChatPremium(selectedChat) ? 'Активен' : 'Отсутствует' }}
          </span>
        </div>
        <p class="status-text" v-if="isChatPremium(selectedChat)">
          Подписка действует до: <b>{{ formatPremiumDate(selectedChat.premium_until) }}</b>
        </p>
        <p class="shop-desc mb-15" v-else>
          Активируйте Premium для доступа к продвинутому анти-мату, удалению ссылок и другим фишкам!
        </p>
        <button @click="buyChatPremium" class="buy-btn text-center-btn primary-btn">
          {{ isChatPremium(selectedChat) ? 'Продлить Premium (100 Stars)' : 'Купить Premium (100 Stars)' }}
        </button>
      </div>

      <div class="settings-card danger-card mt-15">
        <div class="card-header">
          <h3 class="danger-title">🧟‍♂️ Мертвые души (AFK)</h3>
        </div>
        <p class="shop-desc mb-15">Поиск участников, которые не писали в чат больше 7 дней.</p>

        <button v-if="!afkSearched && !isAfkLoading" @click="loadAfkUsers" class="buy-btn text-center-btn outline-btn">
          🔍 Найти неактивных
        </button>

        <div v-if="isAfkLoading" class="spinner-container mt-10">
          <div class="spinner"></div>
        </div>

        <div v-if="afkSearched && !isAfkLoading" class="afk-results fade-in">
          <div v-if="afkUsers.length === 0" class="success-state">
            <span class="icon">✨</span>
            <p>Все участники активны!</p>
          </div>
          <div v-else>
            <div class="afk-list">
              <div v-for="u in afkUsers" :key="u.tg_id" class="afk-item">
                <div class="afk-user-info">
                  <span class="afk-name">@{{ u.username }}</span>
                  <span class="afk-id">{{ u.tg_id }}</span>
                </div>
                <span class="afk-date">{{ u.last_activity > 0 ? new Date(u.last_activity).toLocaleDateString() : 'Никогда' }}</span>
              </div>
            </div>
            <button @click="kickAfkUsers" class="danger-btn mt-15 solid-danger-btn full-width">
              🥾 Кикнуть всех ({{ afkUsers.length }})
            </button>
          </div>
        </div>
      </div>

      <div class="settings-card mt-15">
        <div class="card-header">
          <h3 class="accent-title">🛡 Анти-Рейд</h3>
          <span class="badge badge-free">Бесплатно</span>
        </div>
        <p class="shop-desc mb-15">Автоматически блокирует инвайты от свежих аккаунтов, защищая чат от спам-ферм.</p>
        
        <div class="slider-container">
          <div class="slider-header">
            <label>Новичком считается (дней):</label>
            <span class="slider-value">{{ selectedChat.anti_raid_days || 0 }}</span>
          </div>
          <input type="range" min="0" max="30" v-model.number="selectedChat.anti_raid_days" @change="saveChatSettings" class="ui-slider modern-slider" />
          <p class="shop-desc mt-10 warning-text" v-if="selectedChat.anti_raid_days == 0">⚠️ Защита полностью отключена.</p>
        </div>
      </div>

      <div class="settings-card mt-15" v-if="isChatPremium(selectedChat)">
        <div class="card-header">
          <h3 class="success-title">🛡 Premium Анти-Спам</h3>
          <span class="badge badge-premium">PRO</span>
        </div>
        <div class="toggle-list">
          <div class="setting-row">
            <label>Удалять сторонние ссылки</label>
            <select v-model="selectedChat.anti_link" @change="saveChatSettings" class="ui-select modern-select">
              <option :value="1">Включено</option>
              <option :value="0">Выключено</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Удалять пересылки из каналов</label>
            <select v-model="selectedChat.anti_forward" @change="saveChatSettings" class="ui-select modern-select">
              <option :value="1">Включено</option>
              <option :value="0">Выключено</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="settings-card mt-15">
        <div class="card-header">
          <h3>🤬 Premium Анти-мат</h3>
          <span v-if="!isChatPremium(selectedChat)" class="badge badge-expired">Требуется PRO</span>
        </div>
        <div class="toggle-list" :class="{ 'disabled-block': !isChatPremium(selectedChat) }">
          <div class="setting-row">
            <label>Статус фильтра</label>
            <select v-model="selectedChat.antimat_enabled" @change="saveChatSettings" class="ui-select modern-select" :disabled="!isChatPremium(selectedChat)">
              <option :value="1">Включен</option>
              <option :value="0">Выключен</option>
            </select>
          </div>
          
          <div class="slide-down" v-if="selectedChat.antimat_enabled === 1 && isChatPremium(selectedChat)">
            <div class="setting-row">
              <label>Наказание нарушителя</label>
              <select v-model="selectedChat.punishment_type" @change="saveChatSettings" class="ui-select modern-select">
                <option value="delete">Просто удалять мат</option>
                <option value="mute">Выдавать Мут</option>
                <option value="kick">Кик (5 матов/час)</option>
              </select>
            </div>
            <div class="setting-row" v-if="selectedChat.punishment_type === 'mute'">
              <label>Время мута</label>
              <select v-model="selectedChat.mute_duration" @change="saveChatSettings" class="ui-select modern-select">
                <option :value="1">1 минута</option>
                <option :value="5">5 минут</option>
                <option :value="15">15 минут</option>
                <option :value="60">1 час</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-card mt-15">
        <div class="card-header">
          <h3>📝 Черный список слов</h3>
          <span class="badge badge-free">Бесплатно</span>
        </div>
        <p class="shop-desc mb-15">Сообщения, содержащие эти слова, будут моментально удаляться ботом без предупреждений.</p>
        
        <div class="add-word-row modern-input-group">
          <input v-model="newWord" type="text" placeholder="Введите слово..." class="ui-input modern-input" @keyup.enter="addBadWord" />
          <button @click="addBadWord" class="add-btn modern-add-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        
        <div class="words-list mt-15">
          <div v-if="!selectedChat.bad_words || selectedChat.bad_words.length === 0" class="empty-words">
            Список пуст
          </div>
          <div v-else v-for="word in selectedChat.bad_words" :key="word" class="word-chip">
            <span class="chip-text">{{ word }}</span>
            <button class="remove-word-btn" @click="removeBadWord(word)">×</button>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
/* Анимации */
.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.slide-down { animation: slideDown 0.3s ease; overflow: hidden; }
@keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 200px; } }

/* Общие контейнеры */
.chats-module {
  padding: 15px 5px 30px;
  max-width: 600px;
  margin: 0 auto;
}
.section-title {
  font-size: 18px;
  margin-bottom: 15px;
  color: var(--text-main, #fff);
}

/* Стейты загрузки и пустоты */
.loading-state, .empty-state, .spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted, #aaa);
}
.empty-icon { font-size: 48px; margin-bottom: 10px; }
.empty-hint { font-size: 13px; opacity: 0.7; margin-top: 5px; }
.success-state {
  text-align: center;
  padding: 20px;
  background: rgba(46, 204, 113, 0.1);
  border-radius: 12px;
  color: #2ecc71;
}

/* Карточки чатов в списке */
.chat-list { display: flex; flex-direction: column; gap: 12px; }
.chat-item {
  background: var(--bg-secondary, #1c1c1e);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
  border: 1px solid rgba(255,255,255,0.05);
}
.chat-item:active { transform: scale(0.98); background: var(--bg-tertiary, #2c2c2e); }
.chat-info { display: flex; align-items: center; gap: 12px; }
.chat-avatar {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, var(--accent, #007aff), #5ac8fa);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 20px; color: #fff;
}
.chat-details { display: flex; flex-direction: column; }
.chat-title { font-weight: 600; font-size: 16px; color: var(--text-main, #fff); }
.chat-id { font-size: 12px; color: var(--text-muted, #8e8e93); }
.chat-item-meta { display: flex; align-items: center; gap: 8px; }
.chevron { font-size: 24px; color: var(--text-muted, #8e8e93); margin-bottom: 4px; }

/* Бейджи (Статусы) */
.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.badge-premium { background: linear-gradient(45deg, #FFD700, #FFA500); color: #664000; box-shadow: 0 2px 10px rgba(255, 165, 0, 0.3); }
.badge-free { background: rgba(255,255,255,0.1); color: #aaa; }
.badge-active { background: rgba(46, 204, 113, 0.15); color: #2ecc71; }
.badge-expired { background: rgba(231, 76, 60, 0.15); color: #e74c3c; }

/* Навигация */
.header-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.back-btn {
  background: rgba(255,255,255,0.1); border: none; color: var(--text-main, #fff);
  padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;
  cursor: pointer; display: flex; align-items: center; gap: 4px;
}
.back-btn .icon { font-size: 18px; margin-bottom: 2px; }
.current-chat-title { font-weight: bold; color: var(--text-muted, #8e8e93); font-size: 14px; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Карточки настроек */
.settings-card {
  background: var(--bg-secondary, #1c1c1e);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.05);
}
.danger-card { border: 1px solid rgba(255, 69, 58, 0.3); background: linear-gradient(to bottom, rgba(255, 69, 58, 0.05), transparent); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.card-header h3 { margin: 0; font-size: 17px; font-weight: 600; }
.danger-title { color: var(--danger, #ff453a); }
.accent-title { color: var(--accent, #0a84ff); }
.success-title { color: var(--success, #32d74b); }
.shop-desc { font-size: 13px; color: var(--text-muted, #8e8e93); line-height: 1.4; }
.status-text { font-size: 14px; margin-bottom: 15px; }

/* Кнопки */
.full-width { width: 100%; box-sizing: border-box; }
.primary-btn { background: var(--accent, #0a84ff); color: #fff; border: none; font-weight: 600; border-radius: 12px; padding: 12px; }
.outline-btn { background: transparent; border: 1px solid var(--danger, #ff453a); color: var(--danger, #ff453a); font-weight: 600; border-radius: 12px; padding: 12px; }
.solid-danger-btn { background: var(--danger, #ff453a); color: #fff; border: none; font-weight: 600; border-radius: 12px; padding: 12px; }
.disabled-block { opacity: 0.5; pointer-events: none; }

/* AFK Список */
.afk-results { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 5px; }
.afk-list { display: flex; flex-direction: column; max-height: 250px; overflow-y: auto; padding: 5px; }
.afk-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.afk-item:last-child { border-bottom: none; }
.afk-user-info { display: flex; flex-direction: column; }
.afk-name { font-weight: 600; color: var(--text-main, #fff); font-size: 14px; }
.afk-id { font-size: 11px; color: var(--text-muted, #8e8e93); }
.afk-date { font-size: 12px; color: var(--danger, #ff453a); background: rgba(255,69,58,0.1); padding: 4px 8px; border-radius: 8px; }

/* Ползунки и Селекты */
.toggle-list { display: flex; flex-direction: column; gap: 12px; margin-top: 15px; }
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.setting-row:last-child { border-bottom: none; }
.setting-row label { font-size: 14px; font-weight: 500; }
.modern-select { background: rgba(255,255,255,0.05); border: none; color: #fff; padding: 8px 12px; border-radius: 8px; outline: none; text-align: right; }
.slider-container { margin-top: 15px; }
.slider-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; font-weight: 500; }
.slider-value { background: var(--accent, #0a84ff); color: #fff; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
.modern-slider { width: 100%; height: 6px; border-radius: 5px; background: rgba(255,255,255,0.1); outline: none; -webkit-appearance: none; }
.modern-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent, #0a84ff); cursor: pointer; box-shadow: 0 0 10px rgba(10, 132, 255, 0.5); }
.warning-text { color: var(--danger, #ff453a); }

/* Слова-паразиты / Черный список */
.modern-input-group { display: flex; gap: 10px; }
.modern-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 12px; outline: none; transition: border-color 0.2s; }
.modern-input:focus { border-color: var(--accent, #0a84ff); }
.modern-add-btn { background: var(--accent, #0a84ff); color: #fff; border: none; border-radius: 12px; width: 46px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s; }
.modern-add-btn:active { transform: scale(0.95); }
.words-list { display: flex; flex-wrap: wrap; gap: 8px; }
.empty-words { font-size: 13px; color: var(--text-muted, #8e8e93); font-style: italic; }
.word-chip { background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-size: 14px; border: 1px solid rgba(255,255,255,0.05); }
.remove-word-btn { background: transparent; border: none; color: var(--text-muted, #8e8e93); font-size: 16px; cursor: pointer; padding: 0; line-height: 1; margin-top: -2px; transition: color 0.2s; }
.remove-word-btn:hover { color: var(--danger, #ff453a); }

/* Утилиты */
.mt-10 { margin-top: 10px; }
.mt-15 { margin-top: 15px; }
.mb-10 { margin-bottom: 10px; }
.mb-15 { margin-bottom: 15px; }
</style>
