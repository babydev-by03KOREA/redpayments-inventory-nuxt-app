// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: {enabled: true},
    modules: ['@nuxtjs/tailwindcss'],
    runtimeConfig: {
        // server-only
        redpayKey: process.env.REDPAY_KEY,
        redpaySecret: process.env.REDPAY_SECRET,
        redpayBase: process.env.REDPAY_BASE_URL,
        public: {}
    }
})
