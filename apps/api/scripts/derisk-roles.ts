import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Old deployed prod code can't read these enum values yet. Remove them until
  // the new code is deployed, so prod pages that enumerate roles don't 500.
  const before = await prisma.userRole.findMany({
    where: { role: { in: ["COMMITTEE_ACADEMIC", "COMMITTEE_RESEARCH", "COMMITTEE_OTHER"] as any } },
    include: { user: { select: { email: true } } },
  });
  console.log("New-role rows found:", before.map((r) => `${r.user ? "" : ""}${r.role}`));
  const del = await prisma.userRole.deleteMany({
    where: { role: { in: ["COMMITTEE_ACADEMIC", "COMMITTEE_RESEARCH", "COMMITTEE_OTHER"] as any } },
  });
  console.log(`Removed ${del.count} new-role assignment(s). Test users kept (email/password intact); re-add roles after deploy.`);

  const remaining = await prisma.userRole.count({
    where: { role: { in: ["COMMITTEE_ACADEMIC", "COMMITTEE_RESEARCH", "COMMITTEE_OTHER"] as any } },
  });
  console.log(`Remaining new-role rows: ${remaining}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
