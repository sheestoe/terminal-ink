import { Redis } from '@upstash/redis'
import * as process from 'node:process';

// Ensure it doesn't crash if missing locally, but connects on Render
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://exact-bulldog-175575.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAq3XAAIgcDE0NTI3NTkzZDRiMDc0YWM0ODQ1NmU1NGY5NmFiMDI1NQ',
});
