import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

// Workaround for ResizeObserver error
const debounce = (fn: Function, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: any[]) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

const ro = new ResizeObserver(debounce(() => {}, 20))
ro.observe(document.body)

const app = createApp(App)
app.use(ElementPlus)
app.mount('#app')