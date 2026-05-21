import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log("Database Connected"))
  .catch((err) => console.error("Database Connection Error:", err));

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};
