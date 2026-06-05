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
      <p>Загрузка чатов...</p>
    </div>

    <div v-else-if="!selectedChat">
      <div v-if="chats.length === 0" class="empty-state">Бот пока не добавлен ни в одну вашу группу.</div>
      <div v-else class="chat-list">
        <div v-for="chat in chats" :key="chat.chat_id" class="chat-item" @click="selectedChat = chat; afkSearched = false; afkUsers = []">
          <span class="chat-title">{{ chat.title || `Группа ID: ${chat.chat_id}` }}</span>
          <div class="chat-item-meta">
            <span v-if="isChatPremium(chat)" class="premium-badge-mini">Premium ⭐</span>
            <span class="chevron">›</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="chat-settings">
      <button class="back-btn" @click="selectedChat = null">‹ Назад к списку</button>
      
      <div class="settings-card premium-management-card">
        <h3>Premium подписка</h3>
        <div class="setting-row">
          <label>Статус лицензии</label>
          <span :class="isChatPremium(selectedChat) ? 'status-active' : 'status-expired'">
            {{ isChatPremium(selectedChat) ? `Активна до ${formatPremiumDate(selectedChat.premium_until)}` : 'Отсутствует' }}
          </span>
        </div>
        <button @click="buyChatPremium" class="buy-btn text-center-btn">Продлить Premium (100 Stars)</button>
      </div>

      <div class="settings-card mt-10" style="border-color: rgba(255, 69, 58, 0.3);">
        <h3 style="color: var(--danger);">🧟‍♂️ Мертвые души (AFK)</h3>
        <p class="shop-desc mb-10">Поиск участников, которые не писали в чат больше 7 дней.</p>

        <button v-if="!afkSearched && !isAfkLoading" @click="loadAfkUsers" class="buy-btn text-center-btn outline-btn">
          🔍 Найти неактивных
        </button>

        <div v-if="isAfkLoading" class="spinner mt-10"></div>

        <div v-if="afkSearched && !isAfkLoading">
          <div v-if="afkUsers.length === 0" class="empty-state" style="padding: 20px 0;">
            Все участники активны! 🎉
          </div>
          <div v-else>
            <div class="afk-list">
              <div v-for="u in afkUsers" :key="u.tg_id" class="afk-item">
                <span class="afk-name">@{{ u.username }}</span>
                <span class="afk-date">Был(а): {{ u.last_activity > 0 ? new Date(u.last_activity).toLocaleDateString() : 'Никогда' }}</span>
              </div>
            </div>
            <button @click="kickAfkUsers" class="danger-btn mt-10 solid-danger-btn">
              🥾 Кикнуть всех ({{ afkUsers.length }})
            </button>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <h3 style="color: var(--accent);">🛡 Анти-Рейд (Бесплатно)</h3>
        <p class="shop-desc mb-10">Автоматически блокирует инвайты от свежих аккаунтов, защищая чат от спам-ферм.</p>
        <div class="setting-row" style="margin-bottom: 5px;">
          <label>Новичком считается: <b style="color: var(--text-main); font-size: 16px;">{{ selectedChat.anti_raid_days || 0 }} дней</b> в чате</label>
        </div>
        <input type="range" min="0" max="30" v-model.number="selectedChat.anti_raid_days" @change="saveChatSettings" class="ui-slider mb-10" />
        <p class="shop-desc mt-10" v-if="selectedChat.anti_raid_days == 0">Защита полностью отключена.</p>
      </div>

      <div class="settings-card" v-if="isChatPremium(selectedChat)">
        <h3 style="color: var(--success);">🛡 Premium Анти-Спам</h3>
        <div class="setting-row">
          <label>Удалять ссылки</label>
          <select v-model="selectedChat.anti_link" @change="saveChatSettings" class="ui-select"><option :value="1">Вкл</option><option :value="0">Выкл</option></select>
        </div>
        <div class="setting-row">
          <label>Удалять пересылки</label>
          <select v-model="selectedChat.anti_forward" @change="saveChatSettings" class="ui-select"><option :value="1">Вкл</option><option :value="0">Выкл</option></select>
        </div>
      </div>
      
      <div class="settings-card">
        <h3>🤬 Premium Анти-мат</h3>
        <div class="setting-row">
          <label>Статус фильтра</label>
          <select v-model="selectedChat.antimat_enabled" @change="saveChatSettings" class="ui-select" :disabled="!isChatPremium(selectedChat)">
            <option :value="1">Включен</option><option :value="0">Выключен</option>
          </select>
        </div>
        <div class="setting-row" v-if="selectedChat.antimat_enabled === 1">
          <label>Наказание</label>
          <select v-model="selectedChat.punishment_type" @change="saveChatSettings" class="ui-select">
            <option value="delete">Удалять сообщение</option>
            <option value="mute">Мут</option>
            <option value="kick">Кик (5 матов/час)</option>
          </select>
        </div>
        <div class="setting-row" v-if="selectedChat.antimat_enabled === 1 && selectedChat.punishment_type === 'mute'">
          <label>Время мута</label>
          <select v-model="selectedChat.mute_duration" @change="saveChatSettings" class="ui-select">
            <option :value="1">1 минута</option><option :value="5">5 минут</option><option :value="15">15 минут</option><option :value="60">1 час</option>
          </select>
        </div>
      </div>

      <div class="settings-card mt-10">
        <h3>Черный список слов</h3>
        <p class="shop-desc mb-10" style="color: var(--success); font-weight: 500;">🆓 Бесплатная функция. Сообщения, содержащие эти слова, будут просто удаляться ботом.</p>
        <div class="add-word-row">
          <input v-model="newWord" type="text" placeholder="Новое слово..." class="ui-input" />
          <button @click="addBadWord" class="add-btn">+</button>
        </div>
        <div class="words-list">
          <div v-for="word in selectedChat.bad_words || []" :key="word" class="word-chip">
            {{ word }} <span class="remove-word" @click="removeBadWord(word)">×</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.outline-btn {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
}
.solid-danger-btn {
  background: var(--danger);
  color: #fff;
  border: none;
}
.afk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  background: rgba(0,0,0,0.2);
  padding: 10px;
  border-radius: 12px;
}
.afk-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.afk-item:last-child { border-bottom: none; }
.afk-name { color: var(--text-main); font-weight: 600; }
.afk-date { color: var(--text-muted); }
</style>