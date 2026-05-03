import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appBase = env.VITE_APP_BASE || '/gann/'
  const yahooProxyPrefix = env.VITE_YAHOO_PROXY_PREFIX || '/api/yahoo'
  const yahooProxyTarget = env.VITE_YAHOO_PROXY_TARGET || 'https://query1.finance.yahoo.com'
  const marketProxyPrefix = env.VITE_MARKET_PROXY_PREFIX || '/api/n1-market'
  const marketProxyTarget = env.VITE_MARKET_PROXY_TARGET || env.VITE_MARKET_API_BASE || 'http://192.168.2.3:18080'

  return {
    base: appBase,
    plugins: [vue()],
    server: {
      host: true,
      proxy: {
        [yahooProxyPrefix]: {
          target: yahooProxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(new RegExp(`^${escapeRegExp(yahooProxyPrefix)}`), ''),
        },
        [marketProxyPrefix]: {
          target: marketProxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(new RegExp(`^${escapeRegExp(marketProxyPrefix)}`), ''),
        },
      },
    },
  }
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
