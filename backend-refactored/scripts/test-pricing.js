#!/usr/bin/env node
require('dotenv').config();
const Pricing = require('../models/Pricing');

async function testPricing() {
  try {
    console.log('Testing pricing model...\n');

    // Test 1: Get Pro tier
    console.log('=== Test 1: Get Pro Tier ===');
    const proTier = await Pricing.getByTierKey('pro');
    console.log('Pro tier:', JSON.stringify(proTier, null, 2));
    console.log('Price:', proTier.price);
    console.log('Features:', proTier.features);
    console.log('');

    // Test 2: Get all tiers
    console.log('=== Test 2: Get All Tiers ===');
    const allTiers = await Pricing.getAllTiers();
    allTiers.forEach(tier => {
      console.log(`${tier.tier_key}: $${tier.price}/month`);
      console.log(`  Queries: ${tier.features.queries_per_day === -1 ? 'Unlimited' : tier.features.queries_per_day}`);
      console.log(`  Uploads: ${tier.features.uploads_per_month === -1 ? 'Unlimited' : tier.features.uploads_per_month}`);
    });
    console.log('');

    // Test 3: Get limits (backward compatibility)
    console.log('=== Test 3: Get Limits Format ===');
    const limits = await Pricing.getLimits('pro');
    console.log('Pro limits:', JSON.stringify(limits, null, 2));
    console.log('');

    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testPricing();