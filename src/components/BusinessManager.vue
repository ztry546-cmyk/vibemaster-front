<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import axios from 'axios'
import tSdk from '@twa-dev/sdk'

const WebApp = tSdk.default || tSdk

const props = defineProps({
  tgUserId: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update-balance'])

const businesses = ref([])
const isLoading = ref(true)
const isCollecting = ref(false)

// Каталог для красивого отображения (иконки и цвета)
const bizMeta = {
  shaurma: { icon: "🌯", color: "#ff9f0a" },
  hotel: { icon: "🏨", color: "#0a84ff" },
  casino: { icon: "🎰", color: "#bf5af2" },
  oil: { icon: "🛢", color: "#32ade6" }
}

const totalIncomePerHour = computed(() => {
  return businesses.value.reduce((sum, b) => sum + (b.incomePerHour || 0), 0)
})

const totalUncollected = computed(() => {
  return businesses.value.reduce((sum, b) => sum + (b.uncollected || 0), 0)
})

const fetchBusinesses = async () => {
  try {
    const res = await axios.get(`/api/businesses/${props.tgUserId}`)
    businesses.value = res.data
  } catch (err) {
    console.error('Ошибка загрузки бизнесов:', err)
  } finally {
    isLoading.value = false
  }
}

const collectIncome = async () => {
  if (totalUncollected.value <= 0) return WebApp?.showAlert('Касса пуста! Подождите, пока накапает прибыль.')
  
  isCollecting.value = true
  try {
    const res = await axios.post('/api/businesses/collect', { tg_id: props.tgUserId })
    WebApp?.showAlert(`💰 Инкассация успешна! Собрано: ${res.data.collected} коинов.`)
    emit('update-balance', res.data.newBalance)
    await fetchBusinesses()
  } catch (err) {
    WebApp?.showAlert(err.response?.data?.error || 'Ошибка сбора прибыли')
  } finally {
    isCollecting.value = false
  }
}

let interval;
onMounted(() => {
  fetchBusinesses()
  // Визуально обновляем "накопленное" раз в минуту, чтобы было динамично
  interval = setInterval(fetchBusinesses, 60000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="biz-manager">
    <div class="settings-card summary-card">
      <h3 class="biz-title">💼 Сводка Империи</h3>
      <div class="summary-stats">
        <div class="stat-box">
          <span class="stat-lbl">Доход в час</span>
          <span class="stat-val text-success">+{{ totalIncomePerHour }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-lbl">Ожидает сбора</span>
          <span class="stat-val text-accent">{{ totalUncollected }}</span>
        </div>
      </div>
      <button 
        @click="collectIncome" 
        :disabled="isCollecting || totalUncollected === 0 || isLoading" 
        class="buy-btn text-center-btn mt-10 collect-btn"
      >
        {{ isCollecting ? '⏳ Инкассация...' : '📥 Собрать всю прибыль' }}
      </button>
    </div>

    <h4 class="section-title">Ваши предприятия</h4>
    
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
    </div>
    
    <div v-else-if="businesses.length === 0" class="empty-state">
      <p>У вас пока нет бизнесов 😢</p>
      <p class="shop-desc mt-10">Покупайте предприятия прямо в чатах командой: <br/><code>вм бизнесы</code></p>
    </div>

    <div v-else class="biz-list">
      <div v-for="(biz, idx) in businesses" :key="idx" class="biz-item">
        <div class="biz-icon" :style="{ backgroundColor: bizMeta[biz.business_id]?.color || '#333' }">
          {{ bizMeta[biz.business_id]?.icon || '🏢' }}
        </div>
        <div class="biz-info">
          <div class="biz-header">
            <span class="biz-name">{{ biz.name }} <span class="biz-level">({{ biz.level }} ур)</span></span>
          </div>
          <div class="biz-chat">📍 Чат: {{ biz.chat_title }}</div>
          <div class="biz-details">
            <span class="biz-income">📈 +{{ biz.incomePerHour }}/ч</span>
            <span class="biz-vault">📦 Сейф: <b>{{ biz.uncollected }}</b></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.biz-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.summary-card {
  background: linear-gradient(145deg, rgba(28,28,36,1) 0%, rgba(10,132,255,0.1) 100%);
  border: 1px solid rgba(10, 132, 255, 0.3);
}
.biz-title {
  color: #fff !important;
  margin-bottom: 20px !important;
}
.summary-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.stat-box {
  flex: 1;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.stat-lbl {
  font-size: 12px;
  color: var(--text-muted);
}
.stat-val {
  font-size: 20px;
  font-weight: 800;
}
.text-success { color: var(--success); }
.text-accent { color: var(--accent); }

.collect-btn {
  background: linear-gradient(90deg, #0a84ff, #32ade6);
  box-shadow: 0 4px 15px rgba(10, 132, 255, 0.3);
}

.section-title {
  font-size: 16px;
  color: var(--text-muted);
  margin: 8px 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.biz-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.biz-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.biz-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  flex-shrink: 0;
}

.biz-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.biz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.biz-name {
  font-weight: 700;
  font-size: 15px;
  color: var(--text-main);
}

.biz-level {
  color: var(--accent);
  font-size: 13px;
}

.biz-chat {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.biz-details {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 13px;
  background: rgba(255,255,255,0.03);
  padding: 6px 10px;
  border-radius: 8px;
}

.biz-income {
  color: var(--success);
  font-weight: 600;
}

.biz-vault {
  color: var(--text-main);
}
</style>