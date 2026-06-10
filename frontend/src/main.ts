import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Index from './pages/Index.vue'
import './style.css'

const routes = [
  { path: '/', component: Index },
]

const router = createRouter({
  history: createWebHashHistory('/alert-data-to-sound-mapping/'),
  routes,
})

createApp(App).use(router).mount('#app')
