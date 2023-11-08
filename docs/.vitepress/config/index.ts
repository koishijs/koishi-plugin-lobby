import { defineConfig } from '@koishijs/vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'koishi-plugin-lobby',
  description: '基于 Koishi 的游戏大厅服务',

  locales: {
    'zh-CN': require('./zh-CN'),
  },

  themeConfig: {
    indexName: 'koishi-lobby',

    socialLinks: {
      github: 'https://github.com/koishijs/koishi-plugin-lobby',
    },
  },
})
