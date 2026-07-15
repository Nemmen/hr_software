/**
 * Backfill AppraisalItem.category for rows created before the category column
 * existed. Safe to run repeatedly (only touches rows where category IS NULL).
 *
 *   cd apps/api && pnpm exec ts-node --transpile-only prisma/backfill-item-categories.ts
 *
 * Run AFTER `prisma db push` has added the category column.
 */
import { PrismaClient } from "@prisma/client";
import { categoryForKey } from "../src/lib/appraisalCategories";

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.appraisalItem.findMany({
    where: { category: null },
    select: { id: true, key: true },
  });

  console.log(`Found ${items.length} item(s) without a category.`);

  let updated = 0;
  let skipped = 0;
  for (const item of items) {
    const category = categoryForKey(item.key);
    if (!category) {
      console.warn(`  ! no mapping for key "${item.key}" (item ${item.id})`);
      skipped += 1;
      continue;
    }
    await prisma.appraisalItem.update({
      where: { id: item.id },
      data: { category },
    });
    updated += 1;
  }

  console.log(`Backfill complete: ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
