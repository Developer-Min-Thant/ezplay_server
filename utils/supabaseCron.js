/**
 * Supabase API ping cron job
 * Pings Supabase API every 6 days to keep the connection alive
 */
const cron = require('node-cron');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Initialize the Supabase ping cron job
 * Runs every 6 days (0 0 every-6-days * *)
 */
const initSupabaseCron = () => {
  // Schedule to run at midnight every 6 days
  cron.schedule('0 0 */6 * *', async () => {
    try {
      console.log(`[${new Date().toISOString()}] Running Supabase ping job...`);
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Supabase credentials not found in environment variables. Skipping ping.');
        return;
      }
      
      const { data } = await axios.get(`${SUPABASE_URL}/auth/v1/health`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      console.log(`[${new Date().toISOString()}] Pinged Supabase successfully`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Supabase ping failed:`, err.message);
    }
  });
  
  console.log('Supabase ping cron job initialized (runs every 6 days)');
};

module.exports = { initSupabaseCron };
