<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import tSdk from '@twa-dev/sdk'

const WebApp = tSdk.default || tSdk

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

// Сигналы наверх, чтобы основной файл обновил данные после покупок
const emit = defineEmits(['refresh-user', 'refresh-chats'])

const promoCode = ref('')
const karmaExchangeAmount = ref(50)
const customPrefix = ref('')

const prefixPrice = computed(() => {
  const length = customPrefix.value.trim().length
  if (length === 0) return 0
  return 500 + (length * 50)
})

const activatePromoCode = async () => {
  const code = promoCode.value.trim()
  if (!code) return WebApp?.showAlert('Введите промокод!')
  try {
    const res = await axios.post('/api/activate-promo', { code })
    WebApp?.showAlert(res.data.message || '🎉 Промокод успешно активирован!')
    promoCode.value = ''
    WebApp?.HapticFeedback?.notificationOccurred('success')
    
    // Обновляем данные пользователя и чатов
    emit('refresh-user')
    emit('refresh-chats')
  } catch (e) {
    WebApp?.showAlert(e.response?.data?.error || 'Ошибка активации.')
    WebApp?.HapticFeedback?.notificationOccurred('error')
  }
}

const exchangeKarma = async () => {
  if (karmaExchangeAmount.value % 50 !== 0 || karmaExchangeAmount.value <= 0) {
    return WebApp?.showAlert('Ошибка: Введите число коинов, кратное 50 (50, 100, 150...)!')
  }
  if (props.user.coins < karmaExchangeAmount.value) {
    return WebApp?.showAlert('Не хватает коинов на балансе!')
  }
  try {
    const res = await axios.post('/api/exchange-karma', { amount: karmaExchangeAmount.value })
    WebApp?.showAlert(`Успех! Списано ${karmaExchangeAmount.value} коинов, добавлено ${res.data.karmaGained} кармы 📈`)
    WebApp?.HapticFeedback?.notificationOccurred('success')
    emit('refresh-user')
  } catch (e) {
    WebApp?.showAlert(e.response?.data?.error || 'Ошибка обмена')
  }
}

const buyPrefix = async () => {
  const prefix = customPrefix.value.trim()
  if (!prefix) return WebApp?.showAlert('Введите желаемый титул!')
  try {
    await axios.post('/api/buy-prefix', { prefix })
    WebApp?.showAlert(`Титул [${prefix}] успешно приобретен!`)
    customPrefix.value = ''
    WebApp?.HapticFeedback?.notificationOccurred('success')
    emit('refresh-user')
  } catch (e) {
    WebApp?.showAlert(e.response?.data?.error || 'Ошибка покупки титула')
  }
}
</script>

<template>
  <div class="shop-module">
    <div class="settings-card">
      <h3>🎟 Активация промокода</h3>
      <input v-model="promoCode" type="text" placeholder="Например: COIN-XXXX" class="ui-input mb-10" />
      <button @click="activatePromoCode" :disabled="!promoCode" class="buy-btn text-center-btn mt-10">Активировать код</button>
    </div>

    <div class="settings-card">
      <h3>📈 Биржа Кармы</h3>
      <p class="shop-desc">Обменяй лишние коины (Курс: 50 Coins = 1 Карма).</p>
      <input v-model="karmaExchangeAmount" type="number" placeholder="Кратное 50" class="ui-input mb-10" />
      <div class="exchange-preview" v-if="karmaExchangeAmount > 0 && karmaExchangeAmount % 50 === 0">
        <span>{{ karmaExchangeAmount }} Coins</span> ➡️ <span>{{ karmaExchangeAmount / 50 }} Карма</span>
      </div>
      <button @click="exchangeKarma" class="buy-btn text-center-btn" style="background: var(--success);">Произвести обмен</button>
    </div>

    <div class="settings-card">
      <h3>👑 Покупка Титула</h3>
      <input v-model="customPrefix" type="text" placeholder="Например: Великий" class="ui-input mb-10" maxlength="20" />
      <div class="price-preview" v-if="customPrefix">Стоимость: <b>{{ prefixPrice }} Coins</b></div>
      <button @click="buyPrefix" :disabled="!customPrefix" class="buy-btn text-center-btn mt-10">Купить титул</button>
    </div>
  </div>
</template>