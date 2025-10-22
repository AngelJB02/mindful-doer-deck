// Script temporal para aplicar migraciones a tu base de datos de Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://fkgvdjlapxprubafhjln.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZ3ZkamxhcHhwcnViYWZoamxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1MzY5NiwiZXhwIjoyMDc2NzI5Njk2fQ.GtCQm5xV8mnCQyZ9gK_hRSY7ABHjTAsxuUlTGVPNK3g";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  const migrationsDir = './supabase/migrations';
  const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort();
  
  console.log('Aplicando migraciones...');
  
  for (const file of files) {
    console.log(`Aplicando: ${file}`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
      if (error) {
        console.error(`Error en ${file}:`, error);
      } else {
        console.log(`✅ ${file} aplicado correctamente`);
      }
    } catch (err) {
      console.error(`Error ejecutando ${file}:`, err);
    }
  }
}

applyMigrations();