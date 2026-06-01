import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../.env') })

import app from './app'

const port = Number(process.env.PORT) || 3001
app.listen(port, '0.0.0.0', () => {
  console.log(`Iris_cal server running on http://localhost:${port}`)
})
