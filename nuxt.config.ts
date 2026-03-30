export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  components: [
    { path: '~/components/ui', pathPrefix: false, ignore: ['**/index.ts'] },
    { path: '~/components' },
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Harbor — Inmobarco',
      meta: [
        { name: 'description', content: 'Plataforma interna de operaciones inmobiliarias' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/isotipo.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap' }
      ]
    }
  },

  runtimeConfig: {
    public: {
      wasiApiUrl: '',
      wasiApiToken: '',
      wasiApiId: '',
      apiBaseUrl: '',
      apiToken: '',
      n8nWebhookCreateAppointment: '',
      n8nWebhookAddRow: '',
      cardUrl: '',
      encryptionKey: '',
      encryptionSalt: '',
      appName: 'Harbor',
      appEnv: 'development',
    }
  },

  typescript: {
    strict: true,
  },

  compatibilityDate: '2025-01-01',
})
