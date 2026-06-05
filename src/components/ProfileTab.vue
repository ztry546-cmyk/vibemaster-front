<script setup>
import { computed } from 'vue'
import tSdk from '@twa-dev/sdk'
import axios from 'axios'

const WebApp = tSdk.default || tSdk

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['refresh-user'])

const buyVip = async () => {
  try {
    const res = await axios.post('/api/create-invoice')
    if (res.data.invoiceLink) {
      WebApp?.openInvoice(res.data.invoiceLink, async (status) => {
        if (status === 'paid') {
          WebApp?.showAlert('Оплата прошла успешно! VIP статус активирован на 30 дней. 🎉')
          emit('refresh-user')
        }
      })
    }
  } catch (err) {
    WebApp?.showAlert('Не удалось сгенерировать чек на VIP')
  }
}

const buyCrystals = async (packageId) => {
  try {
    const res = await axios.post('/api/create-crystals-invoice', { package_id: packageId })
    if (res.data.invoiceLink) {
      WebApp?.openInvoice(res.data.invoiceLink, async (status) => {
        if (status === 'paid') {
          WebApp?.showAlert('💎 Кристаллы успешно зачислены на ваш баланс!')
          emit('refresh-user')
        }
      })
    }
  } catch (err) {
    WebApp?.showAlert('Не удалось сгенерировать чек на Кристаллы')
  }
}
</script>

<template>
  <div class="dashboard">
    <div v-if="user.prefix" class="prefix-display">
      <span class="stat-label">Ваш Титул:</span>
      <span class="prefix-value">[{{ user.prefix }}]</span>
    </div>

    <div class="cards-grid">
      <div class="stat-card">
        <span class="stat-label">Баланс</span>
        <div class="stat-value-container">
          <span class="stat-value">{{ user.coins }}</span>
          <span class="currency">Coins</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Карма</span>
        <div class="stat-value-container">
          <span class="stat-value">{{ user.karma }}</span>
          <span class="currency">Pts</span>
        </div>
      </div>
    </div>

    <div class="stat-card crystal-card mb-10">
      <span class="stat-label">ВайбКристаллы (Донат-валюта)</span>
      <div class="stat-value-container">
        <span class="stat-value" style="color: var(--vip-glow);">{{ user.crystals || 0 }}</span>
        <span class="currency">💎</span>
      </div>
    </div>

    <div class="action-section">
      <div v-if="user.is_vip > 0" class="vip-active-card mt-10">
        <span class="vip-title">VIP Статус</span>
        <span class="vip-status">До: {{ new Date(user.is_vip).toLocaleDateString('ru-RU') }}</span>
      </div>
      
      <div v-else class="settings-card vip-promo-card mt-10 mb-0">
        <h3>💎 VIP на 30 дней</h3>
        <p class="shop-desc">Особая галочка, элитные работы и приоритетный статус!</p>
        <button @click="buyVip" class="buy-btn">
          <span class="btn-text">Купить VIP на месяц</span>
          <span class="btn-price">50 ⭐️</span>
        </button>
      </div>

      <div class="settings-card mt-10">
        <h3>🛒 Купить ВайбКристаллы</h3>
        <p class="shop-desc mb-10">Покупай Кристаллы с оптовой выгодой напрямую через Telegram Stars.</p>
        
        <div class="crystal-packs">
          <button class="pack-btn" @click="buyCrystals('start')">
            <span class="pack-amount">50 💎</span>
            <span class="pack-price">100 ⭐️</span>
          </button>
          
          <button class="pack-btn pack-pro" @click="buyCrystals('pro')">
            <span class="pack-badge">Скидка 25 ⭐️</span>
            <span class="pack-amount">150 💎</span>
            <span class="pack-price">225 ⭐️</span>
          </button>
          
          <button class="pack-btn pack-custom-250" @click="buyCrystals('pack_250')">
            <span class="pack-badge pack-badge-blue">Выгодно 🔥</span>
            <span class="pack-amount">250 💎</span>
            <span class="pack-price">350 ⭐️</span>
          </button>
          
          <button class="pack-btn pack-custom-350" @click="buyCrystals('pack_350')">
            <span class="pack-badge pack-badge-green">Топ Сила 💪</span>
            <span class="pack-amount">350 💎</span>
            <span class="pack-price">450 ⭐️</span>
          </button>
          
          <button class="pack-btn pack-magnat" @click="buyCrystals('magnat')">
            <span class="pack-badge pack-badge-magnat">Магнат (Хит!)</span>
            <span class="pack-amount">500 💎</span>
            <span class="pack-price">700 ⭐️</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Локальные стили для новых тарифов */
.pack-custom-250 {
  border-color: rgba(50, 173, 230, 0.4);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(50, 173, 230, 0.1) 100%);
}
.pack-custom-250 .pack-price {
  color: #32ade6;
}
.pack-badge-blue {
  background: #32ade6;
  color: #fff;
}

.pack-custom-350 {
  border-color: rgba(52, 199, 89, 0.4);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(52, 199, 89, 0.1) 100%);
}
.pack-custom-350 .pack-price {
  color: #34c759;
}
.pack-badge-green {
  background: #34c759;
  color: #fff;
}
</style>