import 'dotenv/config';
import { prisma } from './lib/prisma.js';

async function seed() {
  console.log('Seeding test data...\n');

  // Merchant user (pretend Clerk onboarding already done)
  const merchant = await prisma.user.upsert({
    where: { email: 'merchant@test.com' },
    update: {},
    create: {
      clerkId: 'clerk_merchant_test_001',
      email: 'merchant@test.com',
      name: 'Alice Merchant',
      role: 'merchant',
      slug: 'alice-merchant',
      stripeAccountId: 'acct_merchant_test',   // fake — replace with real Express account
      stripeOnboardingComplete: true,
    },
  });
  console.log('✓ Merchant:', merchant.id, merchant.email);

  // Affiliate user
  const affiliate = await prisma.user.upsert({
    where: { email: 'affiliate@test.com' },
    update: {},
    create: {
      clerkId: 'clerk_affiliate_test_001',
      email: 'affiliate@test.com',
      name: 'Bob Affiliate',
      role: 'affiliate',
      slug: 'bob-affiliate',
      stripeAccountId: 'acct_affiliate_test',  // fake — replace with real Express account
      stripeOnboardingComplete: true,
    },
  });
  console.log('✓ Affiliate:', affiliate.id, affiliate.email);

  // Product
  const product = await prisma.product.upsert({
    where: { slug: 'handmade-leather-tote' },
    update: {},
    create: {
      merchantId: merchant.id,
      title: 'Handmade Leather Tote',
      description: 'A beautifully crafted leather tote bag made by hand in Portugal.',
      price: 10000,        // $100.00
      currency: 'usd',
      commissionRate: 15,  // 15%
      slug: 'handmade-leather-tote',
      status: 'active',
    },
  });
  console.log('✓ Product:', product.id, product.title, `$${product.price / 100}`);

  // Affiliate link
  const link = await prisma.affiliateLink.upsert({
    where: { refCode: 'TESTREF1' },
    update: {},
    create: {
      productId: product.id,
      affiliateId: affiliate.id,
      refCode: 'TESTREF1',
      customLabel: 'Instagram campaign',
    },
  });
  const url = `http://localhost:3000/p/${product.slug}?ref=${link.refCode}`;
  console.log('✓ Affiliate link:', link.id);
  console.log('  URL:', url);

  console.log('\n--- Fee breakdown for this product ---');
  const gross = product.price;
  const platformFee = Math.round(gross * 0.02);
  const affiliateCommission = Math.round(gross * 0.15);
  const merchantPayout = gross - platformFee - affiliateCommission;
  console.log(`  Buyer pays:          $${(gross / 100).toFixed(2)}`);
  console.log(`  Platform fee (2%):  -$${(platformFee / 100).toFixed(2)}`);
  console.log(`  Affiliate (15%):    -$${(affiliateCommission / 100).toFixed(2)}`);
  console.log(`  Merchant receives:   $${(merchantPayout / 100).toFixed(2)}`);

  console.log('\nSeed complete. IDs for testing:');
  console.log('  merchantId:', merchant.id);
  console.log('  affiliateId:', affiliate.id);
  console.log('  productId:', product.id);
  console.log('  productSlug:', product.slug);
  console.log('  refCode:', link.refCode);

  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
