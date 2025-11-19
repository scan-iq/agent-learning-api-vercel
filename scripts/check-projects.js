import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jvccmgcybmphebyvvnxo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y2NtZ2N5Ym1waGVieXZ2bnhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI4MDUwNiwiZXhwIjoyMDc3ODU2NTA2fQ.3A5Qdg8Ezu-lZhIbdXrsA0V1X60v6eDgMNaF9NyjoRU'
);

async function check() {
  // Check expert signatures to see what projects exist
  const { data: experts } = await supabase
    .from('expert_signatures')
    .select('project')
    .limit(10);

  console.log('Projects in expert_signatures:', experts);

  // Check API keys
  const { data: keys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('active', true);

  console.log('\nActive API keys:', keys);
}

check().then(() => process.exit(0));
