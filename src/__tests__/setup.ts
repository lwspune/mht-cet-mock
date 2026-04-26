import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.local first (takes precedence), then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
