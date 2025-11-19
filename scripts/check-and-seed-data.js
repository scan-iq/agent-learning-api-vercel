#!/usr/bin/env node
/**
 * Check existing data and seed test data for IRIS Prime dashboard
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jvccmgcybmphebyvvnxo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y2NtZ2N5Ym1waGVieXZ2bnhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI4MDUwNiwiZXhwIjoyMDc3ODU2NTA2fQ.3A5Qdg8Ezu-lZhIbdXrsA0V1X60v6eDgMNaF9NyjoRU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Checking existing data in Supabase...\n');

  const tables = [
    'expert_signatures',
    'iris_reports',
    'reflexion_bank',
    'model_run_log',
    'consensus_lineage',
    'iris_telemetry'
  ];

  const counts = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`);
    } else {
      counts[table] = count || 0;
      console.log(`✅ ${table}: ${count || 0} rows`);
    }
  }

  console.log('\n📊 Summary:');
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`Total rows across all tables: ${total}`);

  return counts;
}

async function seedTestData() {
  console.log('\n🌱 Seeding test data...\n');

  const projectId = 'test-project';
  const projectName = 'Test Project';

  // 1. Create expert signatures
  console.log('Creating expert signatures...');
  const { error: expertError } = await supabase
    .from('expert_signatures')
    .upsert([
      {
        expert_id: 'expert-1',
        project: projectId,
        signature: { model: 'gpt-4', temperature: 0.7 },
        version: '1.0.0',
        active: true,
        performance_metrics: {
          accuracy: 0.92,
          total_calls: 150,
          avg_latency: 850
        }
      },
      {
        expert_id: 'expert-2',
        project: projectId,
        signature: { model: 'claude-3-opus', temperature: 0.5 },
        version: '1.0.0',
        active: true,
        performance_metrics: {
          accuracy: 0.88,
          total_calls: 120,
          avg_latency: 950
        }
      },
      {
        expert_id: 'expert-3',
        project: projectId,
        signature: { model: 'gpt-4-turbo', temperature: 0.8 },
        version: '1.0.0',
        active: true,
        performance_metrics: {
          accuracy: 0.85,
          total_calls: 100,
          avg_latency: 750
        }
      }
    ], { onConflict: 'expert_id,project' });

  if (expertError) console.error('❌ Expert error:', expertError.message);
  else console.log('✅ Expert signatures created');

  // 2. Create model runs
  console.log('Creating model runs...');
  const modelRuns = [];
  for (let i = 0; i < 20; i++) {
    const expertId = `expert-${(i % 3) + 1}`;
    const timestamp = new Date(Date.now() - i * 3600000).toISOString();
    modelRuns.push({
      project: projectId,
      expert_id: expertId,
      model: expertId === 'expert-1' ? 'gpt-4' : expertId === 'expert-2' ? 'claude-3-opus' : 'gpt-4-turbo',
      timestamp,
      outcome: Math.random() > 0.15 ? 'success' : 'failure',
      confidence: 0.7 + Math.random() * 0.25,
      tokens_in: Math.floor(500 + Math.random() * 1500),
      tokens_out: Math.floor(200 + Math.random() * 800),
      cost_usd: 0.01 + Math.random() * 0.05,
      latency_ms: 700 + Math.random() * 400
    });
  }

  const { error: runError } = await supabase
    .from('model_run_log')
    .insert(modelRuns);

  if (runError) console.error('❌ Model run error:', runError.message);
  else console.log('✅ Model runs created');

  // 3. Create reflexions
  console.log('Creating reflexions...');
  const { error: refError } = await supabase
    .from('reflexion_bank')
    .insert([
      {
        project: projectId,
        reflexion_type: 'strategy',
        pattern: 'Chain-of-thought prompting',
        description: 'Break complex problems into steps',
        success: true,
        impact_score: 0.85,
        reuse_count: 12
      },
      {
        project: projectId,
        reflexion_type: 'few_shot',
        pattern: 'Three-shot examples',
        description: 'Provide 3 examples for classification',
        success: true,
        impact_score: 0.78,
        reuse_count: 8
      },
      {
        project: projectId,
        reflexion_type: 'reasoning_chain',
        pattern: 'Explain-then-answer',
        description: 'Generate explanation before final answer',
        success: true,
        impact_score: 0.82,
        reuse_count: 15
      }
    ]);

  if (refError) console.error('❌ Reflexion error:', refError.message);
  else console.log('✅ Reflexions created');

  // 4. Create consensus decisions
  console.log('Creating consensus decisions...');
  const { error: consError } = await supabase
    .from('consensus_lineage')
    .insert([
      {
        project: projectId,
        contributing_experts: ['expert-1', 'expert-2', 'expert-3'],
        confidence: 0.89,
        disagreement_score: 0.12,
        final_decision: { action: 'approve', confidence: 0.89 }
      }
    ]);

  if (consError) console.error('❌ Consensus error:', consError.message);
  else console.log('✅ Consensus decisions created');

  // 5. Create telemetry events
  console.log('Creating telemetry events...');
  const telemetryEvents = [];
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(Date.now() - i * 1800000).toISOString();
    telemetryEvents.push({
      project_id: projectId,
      event_type: ['model_call', 'consensus', 'reflexion', 'error'][Math.floor(Math.random() * 4)],
      severity: ['info', 'warning', 'critical'][Math.floor(Math.random() * 3)],
      message: `Test event ${i}`,
      event_data: { test: true, index: i }
    });
  }

  const { error: telError } = await supabase
    .from('iris_telemetry')
    .insert(telemetryEvents);

  if (telError) console.error('❌ Telemetry error:', telError.message);
  else console.log('✅ Telemetry events created');

  // 6. Create IRIS reports
  console.log('Creating IRIS reports...');
  const { error: reportError } = await supabase
    .from('iris_reports')
    .insert([
      {
        project: projectId,
        report_type: 'health_check',
        data: {
          overall_health: 'healthy',
          metrics: { accuracy: 0.88, latency: 850, cost: 0.03 }
        }
      }
    ]);

  if (reportError) console.error('❌ Report error:', reportError.message);
  else console.log('✅ IRIS reports created');

  console.log('\n✅ Test data seeding complete!');
  console.log(`\nYou can now test with projectId: "${projectId}"`);
  console.log(`API Key: sk_live_-0gfZZUwJ8eCi6rPI-w-NpPshmKTAgZPlc82qGwTgVU`);
}

async function main() {
  const counts = await checkData();

  const isEmpty = Object.values(counts).every(c => c === 0);

  if (isEmpty) {
    console.log('\n📝 Database is empty. Would you like to seed test data? (yes/no)');
    console.log('Running seed automatically...');
    await seedTestData();
  } else {
    console.log('\n✅ Database already has data. Skipping seed.');
  }

  // Test the API endpoints
  console.log('\n🧪 Testing API endpoints...');
  console.log('\nTest these endpoints:');
  console.log('1. Overview: https://iris-prime-api.vercel.app/api/iris/overview');
  console.log('2. Analytics: https://iris-prime-api.vercel.app/api/iris/analytics');
  console.log('\nWith header: Authorization: Bearer sk_live_-0gfZZUwJ8eCi6rPI-w-NpPshmKTAgZPlc82qGwTgVU');
}

main().catch(console.error).finally(() => process.exit(0));
