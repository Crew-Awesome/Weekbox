import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true // tenemos que exponerlo a la red wifi para Expo Go (react native)
  },
  build: {
    outDir: '../app', // manda lo estatico aca (empieza lo bueno)
    emptyOutDir: false // kda nueva compilacion lo limpia pa actualizarlo pa
  }
})
