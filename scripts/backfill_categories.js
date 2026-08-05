/**
 * Backfill Categories Script
 * 
 * Script ini akan mengkategorisasi ulang semua transaksi existing
 * yang belum memiliki kategori menggunakan AI detection.
 * 
 * Usage:
 *   node scripts/backfill_categories.js [--dry-run] [--limit=100]
 * 
 * Options:
 *   --dry-run    Simulasi tanpa update database
 *   --limit=N    Proses maksimal N transaksi (default: semua)
 *   --batch=N    Proses N transaksi per batch (default: 50)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { detectCategory } = require('../src/modules/groqExtractor');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const batchArg = args.find(arg => arg.startsWith('--batch='));

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 50;

async function getUncategorizedTransactions(limit) {
  let query = supabase
    .from('transactions')
    .select('id, jenis, nama, created_at')
    .is('category_id', null)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

async function getCategories(jenis) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('jenis', jenis)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
}

async function getOrCreateCategory(name, jenis) {
  // Check if exists
  const { data: existing } = await supabase
    .from('categories')
    .select('*')
    .eq('name', name)
    .eq('jenis', jenis)
    .single();

  if (existing) {
    return existing;
  }

  // Create new
  const { data: newCat, error } = await supabase
    .from('categories')
    .insert([{ name, jenis }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return newCat;
}

async function updateTransactionCategory(transactionId, categoryId) {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId })
    .eq('id', transactionId);

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`);
  }
}

async function backfillBatch(transactions) {
  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
    newCategories: 0,
    errors: []
  };

  for (const transaction of transactions) {
    try {
      results.processed++;

      // Get categories for this jenis
      const categories = await getCategories(transaction.jenis);

      if (categories.length === 0) {
        console.warn(`⚠️  No categories found for ${transaction.jenis}`);
        results.failed++;
        continue;
      }

      // Detect category using AI
      const categoryDetection = await detectCategory(
        transaction.nama,
        transaction.jenis,
        categories
      );

      if (!categoryDetection.success) {
        console.warn(`⚠️  Failed to detect category for: ${transaction.nama}`);
        results.failed++;
        results.errors.push({
          id: transaction.id,
          nama: transaction.nama,
          reason: categoryDetection.reason
        });
        continue;
      }

      // Get or create category
      const category = await getOrCreateCategory(
        categoryDetection.category,
        transaction.jenis
      );

      if (categoryDetection.isNew) {
        results.newCategories++;
        console.log(`✨ New category created: ${category.name} (${transaction.jenis})`);
      }

      // Update transaction
      if (!isDryRun) {
        await updateTransactionCategory(transaction.id, category.id);
      }

      results.updated++;

      const icon = transaction.jenis === 'pemasukan' ? '🟢' : '🔴';
      console.log(
        `${icon} ${isDryRun ? '[DRY-RUN] ' : ''}` +
        `${transaction.nama} → ${category.name}`
      );

      // Rate limiting to avoid Groq API throttle
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`❌ Error processing transaction ${transaction.id}:`, err.message);
      results.failed++;
      results.errors.push({
        id: transaction.id,
        nama: transaction.nama,
        error: err.message
      });
    }
  }

  return results;
}

async function main() {
  console.log('🚀 Starting category backfill...\n');

  if (isDryRun) {
    console.log('⚠️  DRY-RUN MODE: No changes will be made to database\n');
  }

  // Get uncategorized transactions
  console.log('📊 Fetching uncategorized transactions...');
  const transactions = await getUncategorizedTransactions(limit);

  if (transactions.length === 0) {
    console.log('✅ No uncategorized transactions found!');
    return;
  }

  console.log(`Found ${transactions.length} uncategorized transactions\n`);

  // Process in batches
  const totalResults = {
    processed: 0,
    updated: 0,
    failed: 0,
    newCategories: 0,
    errors: []
  };

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(transactions.length / batchSize);

    console.log(`\n--- Batch ${batchNum}/${totalBatches} ---`);

    const batchResults = await backfillBatch(batch);

    totalResults.processed += batchResults.processed;
    totalResults.updated += batchResults.updated;
    totalResults.failed += batchResults.failed;
    totalResults.newCategories += batchResults.newCategories;
    totalResults.errors.push(...batchResults.errors);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 BACKFILL SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total processed:    ${totalResults.processed}`);
  console.log(`Successfully updated: ${totalResults.updated}`);
  console.log(`Failed:              ${totalResults.failed}`);
  console.log(`New categories created: ${totalResults.newCategories}`);

  if (totalResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    totalResults.errors.forEach(err => {
      console.log(`  - ${err.nama}: ${err.reason || err.error}`);
    });
  }

  if (isDryRun) {
    console.log('\n⚠️  This was a DRY-RUN. No changes were made.');
    console.log('Run without --dry-run to apply changes.');
  }

  console.log('\n✅ Backfill complete!');
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
