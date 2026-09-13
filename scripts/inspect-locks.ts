/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../src/lib/prisma/client";

async function main() {
  console.log("Active queries in pg_stat_activity:");
  try {
    const activities = await prisma.$queryRaw<any[]>`
      SELECT pid, query, state, wait_event_type, wait_event 
      FROM pg_stat_activity 
      WHERE datname = 'shortbox' AND pid != pg_backend_pid();
    `;
    console.log(activities);
  } catch (err) {
    console.error("Failed to query activities:", err);
  }

  console.log("\nLocks in pg_locks:");
  try {
    const locks = await prisma.$queryRaw<any[]>`
      SELECT 
        l.pid,
        l.locktype,
        l.mode,
        l.granted,
        c.relname,
        a.query
      FROM pg_locks l
      LEFT JOIN pg_class c ON l.relation = c.oid
      LEFT JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE a.datname = 'shortbox' AND l.pid != pg_backend_pid();
    `;
    console.log(locks);
  } catch (err) {
    console.error("Failed to query locks:", err);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
