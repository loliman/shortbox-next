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
  const counts = await prisma.$queryRaw<any[]>`
    SELECT 
      (SELECT COUNT(*) FROM shortbox.issue) AS issues,
      (SELECT COUNT(*) FROM shortbox.variant) AS variants,
      (SELECT COUNT(*) FROM shortbox.story) AS stories,
      (SELECT COUNT(*) FROM shortbox.cover) AS covers;
  `;
  console.log("Counts:", counts[0]);

  // 2. Obsolete columns check
  const cols = await prisma.$queryRaw<any[]>`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'shortbox' 
      AND table_name = 'issue' 
      AND column_name IN ('format', 'variant', 'collected', 'releasedate');
  `;
  console.log("Obsolete columns remaining on 'issue' table:", cols.map(c => c.column_name));

  // 3. Duplicate issue check
  const duplicates = await prisma.$queryRaw<any[]>`
    SELECT fk_series, number, COUNT(*) AS count
    FROM shortbox.issue
    GROUP BY fk_series, number
    HAVING COUNT(*) > 1;
  `;
  console.log("Duplicate issue groups remaining:", duplicates.length);

  // 4. Orphaned variants check
  const orphanedVariants = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) AS count
    FROM shortbox.variant v
    WHERE NOT EXISTS (SELECT 1 FROM shortbox.issue i WHERE i.id = v.fk_issue);
  `;
  console.log("Orphaned variants count:", orphanedVariants[0]?.count || 0);

  // 5. Orphaned stories check
  const orphanedStories = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) AS count
    FROM shortbox.story s
    WHERE NOT EXISTS (SELECT 1 FROM shortbox.issue i WHERE i.id = s.fk_issue);
  `;
  console.log("Orphaned stories count:", orphanedStories[0]?.count || 0);
}

async function main() {
  try {
    // Check if table issue still has format/variant columns before migrating
    const cols = await prisma.$queryRaw<any[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'shortbox' 
        AND table_name = 'issue' 
        AND column_name = 'format';
    `;
    
    if (cols.length === 0) {
      console.log("Migration 04 and 05 seem to have been already executed (columns already dropped).");
      await runVerification();
      return;
    }

    console.log("Starting consolidation and schema finalize migrations...");
    await runSqlFile("migration-04-consolidate-issues.sql");
    await runSqlFile("migration-05-finalize-schema.sql");
    await runVerification();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
