export default defineConfig({
  base: './', // <-- ИСПРАВИТЬ ТУТ
  plugins: [vue()],
  server: {
    allowedHosts: true
  }
})