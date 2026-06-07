import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/prisma/client";

async function runSqlFile(filename: string) {
  const filePath = join(__dirname, "sql", filename);
  console.log(`\nReading SQL file: ${filename}...`);
  const sql = readFileSync(filePath, "utf-8");
  
  console.log(`Executing ${filename}...`);
  await prisma.$executeRawUnsafe(sql);
  console.log(`Successfully executed ${filename}`);
}

async function runVerification() {
  console.log("\n=================================");
  console.log("RUNNING VERIFICATION QUERIES");
  console.log("=================================");

  // 1. Issue count vs variant count
  const counts = await prisma.$queryRaw<{ issues: bigint; variants: bigint; stories: bigint; covers: bigint }[]>`
    SELECT 
      (SELECT COUNT(*) FROM shortbox.issue) AS issues,
      (SELECT COUNT(*) FROM shortbox.variant) AS variants,
      (SELECT COUNT(*) FROM shortbox.story) AS stories,
      (SELECT COUNT(*) FROM shortbox.cover) AS covers;
  `;
  console.log("Counts:", {
    issues: counts[0]?.issues.toString(),
    variants: counts[0]?.variants.toString(),
    stories: counts[0]?.stories.toString(),
    covers: counts[0]?.covers.toString(),
  });

  // 2. Obsolete columns check
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'shortbox' 
      AND table_name = 'issue' 
      AND column_name IN ('format', 'variant', 'collected', 'releasedate');
  `;
  console.log("Obsolete columns remaining on 'issue' table:", cols.map(c => c.column_name));

  // 3. Duplicate issue check
  const duplicates = await prisma.$queryRaw<{ fk_series: bigint; number: string; count: bigint }[]>`
    SELECT fk_series, number, COUNT(*) AS count
    FROM shortbox.issue
    GROUP BY fk_series, number
    HAVING COUNT(*) > 1;
  `;
  console.log("Duplicate issue groups remaining:", duplicates.length);

  // 4. Orphaned variants check
  const orphanedVariants = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count
    FROM shortbox.variant v
    WHERE NOT EXISTS (SELECT 1 FROM shortbox.issue i WHERE i.id = v.fk_issue);
  `;
  console.log("Orphaned variants count:", orphanedVariants[0]?.count.toString() || "0");

  // 5. Orphaned stories check
  const orphanedStories = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count
    FROM shortbox.story s
    WHERE NOT EXISTS (SELECT 1 FROM shortbox.issue i WHERE i.id = s.fk_issue);
  `;
  console.log("Orphaned stories count:", orphanedStories[0]?.count.toString() || "0");
}

async function main() {
  try {
    // 1. Check for consolidation migration (04/05)
    const issueCols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'shortbox' 
        AND table_name = 'issue' 
        AND column_name = 'format';
    `;
    const run0405 = issueCols.length > 0;

    // 2. Check for changerequests.fk_issue bigint migration (08)
    const fkIssueType = await prisma.$queryRaw<{ data_type: string }[]>`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'shortbox' 
        AND table_name = 'changerequests' 
        AND column_name = 'fk_issue';
    `;
    const run08 = fkIssueType.length > 0 && fkIssueType[0].data_type === "integer";

    // 3. Check for variant.price decimal migration (09)
    const priceType = await prisma.$queryRaw<{ data_type: string }[]>`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'shortbox' 
        AND table_name = 'variant' 
        AND column_name = 'price';
    `;
    const run09 = priceType.length > 0 && priceType[0].data_type === "double precision";

    // 4. Check for constraints migration (10)
    const constraints = await prisma.$queryRaw<{ constraint_name: string }[]>`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'shortbox' 
        AND table_name = 'publisher' 
        AND constraint_name = 'publisher_pkey';
    `;
    const run10 = constraints.length === 0;

    // 5. Check for task result sequence migration (11)
    const taskResultIdentityAndDefault = await prisma.$queryRaw<{ is_identity: string; column_default: string | null }[]>`
      SELECT is_identity, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'shortbox' 
        AND table_name = 'admin_task_result' 
        AND column_name = 'id';
    `;
    const run11 = taskResultIdentityAndDefault.length > 0 && 
                  taskResultIdentityAndDefault[0].is_identity === "NO" && 
                  !taskResultIdentityAndDefault[0].column_default;

    // 6. Check for variant id sequence migration (12)
    const variantIdentityAndDefault = await prisma.$queryRaw<{ is_identity: string; column_default: string | null }[]>`
      SELECT is_identity, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'shortbox' 
        AND table_name = 'variant' 
        AND column_name = 'id';
    `;
    const run12 = variantIdentityAndDefault.length > 0 && 
                  variantIdentityAndDefault[0].is_identity === "NO" && 
                  !variantIdentityAndDefault[0].column_default;

    // 7. Check for story collection flags backfill migration (13)
    const hasDiscrepancy = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 
        FROM shortbox.story s
        JOIN shortbox.variant v ON v.fk_issue = s.fk_issue
        WHERE v.collected = true AND s.collected = false
      ) AS exists;
    `;
    const run13 = hasDiscrepancy[0]?.exists ?? false;

    if (!run0405 && !run08 && !run09 && !run10 && !run11 && !run12 && !run13) {
      console.log("All migrations seem to have been already executed.");
      await syncAllSequences();
      await runVerification();
      return;
    }

    if (run0405) {
      console.log("Running consolidation and schema finalize migrations...");
      await runSqlFile("migration-04-consolidate-issues.sql");
      await runSqlFile("migration-05-finalize-schema.sql");
    }

    if (run08) {
      console.log("Running migration-08-changerequests-bigint.sql...");
      await runSqlFile("migration-08-changerequests-bigint.sql");
    }

    if (run09) {
      console.log("Running migration-09-variant-price-decimal.sql...");
      await runSqlFile("migration-09-variant-price-decimal.sql");
    }

    if (run10) {
      console.log("Running migration-10-enforce-constraints.sql...");
      await runSqlFile("migration-10-enforce-constraints.sql");
    }

    if (run11) {
      console.log("Running migration-11-fix-task-result-seq.sql...");
      await runSqlFile("migration-11-fix-task-result-seq.sql");
    }

    if (run12) {
      console.log("Running migration-12-fix-variant-id-seq.sql...");
      await runSqlFile("migration-12-fix-variant-id-seq.sql");
    }

    if (run13) {
      console.log("Running migration-13-backfill-story-collection-flags.sql...");
      await runSqlFile("migration-13-backfill-story-collection-flags.sql");
    }

    await syncAllSequences();
    await runVerification();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function syncAllSequences() {
  console.log("\n=================================");
  console.log("SYNCHRONIZING DATABASE SEQUENCES");
  console.log("=================================");
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN
            SELECT 
                tc.table_schema,
                tc.table_name,
                tc.column_name,
                COALESCE(
                    pg_get_serial_sequence(tc.table_schema || '.' || tc.table_name, tc.column_name),
                    CASE 
                        WHEN substring(tc.column_default from 'nextval\\(''([^'']+)''::regclass\\)') LIKE '%.%' 
                        THEN substring(tc.column_default from 'nextval\\(''([^'']+)''::regclass\\)')
                        ELSE tc.table_schema || '.' || substring(tc.column_default from 'nextval\\(''([^'']+)''::regclass\\)')
                    END
                ) AS seq_name
            FROM information_schema.columns tc
            WHERE tc.table_schema = 'shortbox'
              AND (tc.column_default LIKE 'nextval%' OR tc.is_identity = 'YES')
        LOOP
            IF r.seq_name IS NOT NULL THEN
                EXECUTE 'SELECT setval(''' || r.seq_name || ''', COALESCE((SELECT MAX(' || quote_ident(r.column_name) || ') FROM ' || r.table_schema || '.' || r.table_name || '), 0) + 1, false)';
            END IF;
        END LOOP;
    END $$;
  `);
  console.log("All database sequences successfully synchronized.");
}

main();

