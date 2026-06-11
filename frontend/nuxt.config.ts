export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  ssr: false,
  app: {
    baseURL: '/alert-data-to-sound-mapping/',
  },
  nitro: {
    preset: 'static',
  },
})
