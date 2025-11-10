#!/usr/bin/env node
require('dotenv').config();
const Stripe = require('stripe');
const Pricing = require('../models/Pricing');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  try {
    console.log('🔵 Setting up Stripe products...\n');

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in .env');
      process.exit(1);
    }

    // Get all tiers from database
    const tiers = await Pricing.getAllTiers();
    console.log(`Found ${tiers.length} tiers in database\n`);

    for (const tier of tiers) {
      // Skip free tier (no Stripe product needed)
      if (tier.price === 0 || tier.tier_key === 'free') {
        console.log(`⏭️  Skipping ${tier.name} (free tier)`);
        continue;
      }

      console.log(`\n📦 Processing ${tier.name}...`);

      // Check if Stripe product already exists
      if (tier.stripe_price_id) {
        console.log(`   ✅ Already has Stripe Price ID: ${tier.stripe_price_id}`);
        
        // Verify it exists in Stripe
        try {
          const price = await stripe.prices.retrieve(tier.stripe_price_id);
          console.log(`   ✅ Verified in Stripe: $${(price.unit_amount / 100).toFixed(2)}/${price.recurring.interval}`);
          continue;
        } catch (err) {
          console.log(`   ⚠️  Price ID not found in Stripe, will recreate...`);
        }
      }

      // Create product in Stripe
      console.log(`   📦 Creating Stripe product...`);
      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description || `${tier.name} subscription`,
        metadata: {
          tier_key: tier.tier_key,
          tier_id: tier.id.toString()
        }
      });
      console.log(`   ✅ Product created: ${product.id}`);

      // Create price for the product
      console.log(`   💰 Creating price ($${tier.price}/month)...`);
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(tier.price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          tier_key: tier.tier_key,
          tier_id: tier.id.toString()
        }
      });
      console.log(`   ✅ Price created: ${price.id}`);

      // Save price ID back to database
      await Pricing.updatePrice(tier.tier_key, tier.price, price.id);
      console.log(`   💾 Saved to database`);
      console.log(`   ✨ ${tier.name} setup complete!`);
    }

    console.log('\n✅ All Stripe products created successfully!\n');
    console.log('📋 Summary:');
    
    // Show final summary
    const updatedTiers = await Pricing.getAllTiers();
    updatedTiers.forEach(tier => {
      const price = tier.price === 0 ? 'FREE' : `$${tier.price}`;
      const stripeId = tier.stripe_price_id || 'N/A';
      console.log(`   ${tier.name}: ${price}/month - ${stripeId}`);
    });

    console.log('\n🎉 Setup complete! You can now accept payments.\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Error setting up Stripe products:', err.message);
    if (err.type) {
      console.error(`   Type: ${err.type}`);
    }
    if (err.raw) {
      console.error(`   Details: ${err.raw.message}`);
    }
    process.exit(1);
  }
}

setupStripeProducts();