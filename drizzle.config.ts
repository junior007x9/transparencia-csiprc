import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Isso garante que o Drizzle vai ler o seu .env.local
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts', // (ou o caminho onde estiver o seu schema)
  out: './drizzle',
  dialect: 'turso', // ISSO AQUI É O MAIS IMPORTANTE! Tem que ser 'turso'
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});