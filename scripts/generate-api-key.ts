#!/usr/bin/env npx tsx

/**
 * Generate API Key for IRIS Prime Projects
 *
 * Usage:
 *   npx tsx scripts/generate-api-key.ts nfl-predictor
 *   npx tsx scripts/generate-api-key.ts microbiome-platform
 */

import { createApiKey } from '../lib/auth.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  const projectId = process.argv[2];
  const projectName = process.argv[3] || projectId;

  if (!projectId) {
    console.error('Usage: npx tsx scripts/generate-api-key.ts <project-id> [project-name]');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/generate-api-key.ts nfl-predictor "NFL Predictor"');
    console.error('  npx tsx scripts/generate-api-key.ts microbiome-platform');
    console.error('  npx tsx scripts/generate-api-key.ts beclever-ai');
    process.exit(1);
  }

  console.log(`🔑 Generating API key for project: ${projectId}`);

  try {
    const apiKey = await createApiKey(projectId, projectName);

    console.log('');
    console.log('✅ API Key generated successfully!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Project: ${projectName} (${projectId})`);
    console.log(`🔑 API Key: ${apiKey}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📝 Add to your project .env file:');
    console.log('');
    console.log(`IRIS_API_URL=https://iris-prime-hbj41m305-legonow.vercel.app`);
    console.log(`IRIS_API_KEY=${apiKey}`);
    console.log('');
    console.log('🚀 Then run: iris discover --project .');
    console.log('');
    console.log('⚠️  SAVE THIS KEY - It cannot be retrieved later!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Failed to generate API key:', error instanceof Error ? error.message : error);
    console.error('');

    if (error instanceof Error && error.message.includes('duplicate')) {
      console.log('💡 Project already has an API key. To generate a new one:');
      console.log('   1. Revoke the old key in Supabase (project_config table)');
      console.log('   2. Run this script again');
    }

    process.exit(1);
  }
}

main();
