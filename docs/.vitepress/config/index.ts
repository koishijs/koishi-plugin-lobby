import { defineConfig } from '@koishijs/vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'koishi-plugin-lobby',
  description: '基于 Koishi 的游戏大厅服务',

  locales: {
    'zh-CN': require('./zh-CN'),
  },

  head: [
    ['link', { rel: 'icon', href: 'https://koishi.chat/logo.png' }],
    ['link', { rel: 'manifest', href: '/zh-CN/manifest.json' }],
    ['meta', { name: 'theme-color', content: '#5546a3' }],
  ],

  themeConfig: {
    indexName: 'lobby',

    socialLinks: {
      github: 'https://github.com/koishijs/koishi-plugin-lobby',
    },
  },
})
