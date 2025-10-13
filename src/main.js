import { createApp } from 'vue'
import App from './App.vue'
import router from './router'


import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './assets/styles/custom.css'


import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'



import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(router)
app.use(PrimeVue, {
  theme: { preset: Aura },
})



app.mount('#app')
