// Phase 4 verification seed — inserts internships with domain/skills arrays
// and two test users (user-a = frontend/React/Remote, user-b = ml/Python/On-site)
// Run with: node scripts/seed-phase4-verify.js

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const internships = [
  {
    id: 'p4-1',
    title: 'Frontend Engineer Intern',
    company: 'Veritas Labs',
    domain: ['frontend'],
    skills: ['React', 'TypeScript', 'Next.js'],
    location: 'Remote',
    stipend: '$2,000/mo',
    hash: 'p4-veritas-frontend',
    postedAt: new Date('2025-04-01'),
  },
  {
    id: 'p4-2',
    title: 'ML Research Intern',
    company: 'Synthos AI',
    domain: ['ml', 'ai'],
    skills: ['Python', 'PyTorch', 'CUDA'],
    location: 'New York, NY',
    stipend: '$3,000/mo',
    hash: 'p4-synthos-ml',
    postedAt: new Date('2025-04-02'),
  },
  {
    id: 'p4-3',
    title: 'Backend Engineer Intern',
    company: 'DataStream Inc',
    domain: ['backend'],
    skills: ['Go', 'PostgreSQL', 'gRPC'],
    location: 'San Francisco, CA',
    stipend: '$2,500/mo',
    hash: 'p4-datastream-backend',
    postedAt: new Date('2025-04-03'),
  },
  {
    id: 'p4-4',
    title: 'Full Stack Intern',
    company: 'FinEdge',
    domain: ['fullstack', 'frontend'],
    skills: ['React', 'Node.js', 'MongoDB'],
    location: 'Remote',
    stipend: '$1,800/mo',
    hash: 'p4-finedge-fullstack',
    postedAt: new Date('2025-04-04'),
  },
  {
    id: 'p4-5',
    title: 'AI/ML Platform Intern',
    company: 'NeuralBridge',
    domain: ['ml', 'devops'],
    skills: ['Python', 'Kubernetes', 'PyTorch'],
    location: 'Remote',
    stipend: '$2,800/mo',
    hash: 'p4-neuralbridge-ml',
    postedAt: new Date('2025-04-05'),
  },
  {
    id: 'p4-6',
    title: 'DevOps / Platform Intern',
    company: 'CloudBridge',
    domain: ['devops'],
    skills: ['Kubernetes', 'Terraform', 'AWS'],
    location: 'Remote',
    stipend: '$2,200/mo',
    hash: 'p4-cloudbridge-devops',
    postedAt: new Date('2025-04-06'),
  },
  {
    id: 'p4-7',
    title: 'Mobile Developer Intern',
    company: 'Latchkey',
    domain: ['mobile'],
    skills: ['React Native', 'Swift', 'Expo'],
    location: 'Austin, TX',
    stipend: '$1,600/mo',
    hash: 'p4-latchkey-mobile',
    postedAt: new Date('2025-04-07'),
  },
  {
    id: 'p4-8',
    title: 'Frontend / React Intern',
    company: 'Pixel Studio',
    domain: ['frontend'],
    skills: ['React', 'CSS', 'Figma'],
    location: 'Remote',
    stipend: '$1,500/mo',
    hash: 'p4-pixel-frontend',
    postedAt: new Date('2025-04-08'),
  },
];

async function main() {
  console.log('── Seeding internships ──');
  for (const item of internships) {
    await prisma.internship.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
    console.log(`  ✓ ${item.title} @ ${item.company}`);
  }

  console.log('\n── Creating test user profiles ──');

  // User A: frontend/React/Remote
  const userA = await prisma.user.upsert({
    where: { email: 'profile-test-a@devstart.test' },
    update: {
      name: 'Profile Test A',
      domains: ['frontend'],
      skills: ['React', 'TypeScript'],
      locationPref: 'Remote',
    },
    create: {
      email: 'profile-test-a@devstart.test',
      name: 'Profile Test A',
      domains: ['frontend'],
      skills: ['React', 'TypeScript'],
      locationPref: 'Remote',
    },
  });
  console.log(`  ✓ User A (id=${userA.id}): frontend, React+TypeScript, Remote`);

  // User B: ml/Python/On-site
  const userB = await prisma.user.upsert({
    where: { email: 'profile-test-b@devstart.test' },
    update: {
      name: 'Profile Test B',
      domains: ['ml'],
      skills: ['Python', 'PyTorch'],
      locationPref: 'On-site',
    },
    create: {
      email: 'profile-test-b@devstart.test',
      name: 'Profile Test B',
      domains: ['ml'],
      skills: ['Python', 'PyTorch'],
      locationPref: 'On-site',
    },
  });
  console.log(`  ✓ User B (id=${userB.id}): ml, Python+PyTorch, On-site`);

  console.log('\nDone. User IDs for manual JWT testing:');
  console.log(`  USER_A_ID=${userA.id}`);
  console.log(`  USER_B_ID=${userB.id}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
