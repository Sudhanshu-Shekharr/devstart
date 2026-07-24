import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const internships = await prisma.internship.findMany({
    where: { stipend: { not: null } },
    select: { stipend: true },
    distinct: ['stipend']
  });
  console.log("Distinct stipends:", internships.map(i => i.stipend));
}

main().catch(console.error).finally(() => prisma.$disconnect());
