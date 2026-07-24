// NOTE: This seed file is for local dev testing ONLY.
// DO NOT run this against a database with real ingested data, as the hash format doesn't match the sha256(title+company+roughDate) format for the real ingestion pipeline.

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ALL_INTERNSHIPS = [
  {
    id: '1',
    role: 'Frontend Engineer Intern',
    company: 'Veritas Labs',
    location: 'Remote',
    tag: 'Remote',
    stack: 'React · Next.js · TypeScript',
    description: 'Work on production-grade UI components powering a B2B SaaS platform used by 10,000+ engineers. Own features end-to-end from design review to deployment.',
  },
  {
    id: '2',
    role: 'Backend Engineer Intern',
    company: 'DataStream Inc',
    location: 'San Francisco, CA',
    tag: 'On-site',
    stack: 'Go · PostgreSQL · gRPC',
    description: 'Build high-throughput data pipelines that process millions of events per day. Strong systems design fundamentals required; mentorship from senior engineers included.',
  },
  {
    id: '3',
    role: 'ML Research Intern',
    company: 'Synthos AI',
    location: 'New York, NY',
    tag: 'Hybrid',
    stack: 'Python · PyTorch · CUDA',
    description: 'Join our applied research team working on large language model fine-tuning and efficient inference. Publications encouraged; compute budget provided.',
  },
  {
    id: '4',
    role: 'Mobile Developer Intern',
    company: 'Latchkey',
    location: 'Austin, TX',
    tag: 'On-site',
    stack: 'React Native · Swift · Expo',
    description: 'Ship features to our consumer app with 500K+ monthly active users. Work directly with the product and design teams in a fast-paced, startup environment.',
  },
  {
    id: '5',
    role: 'DevOps / Platform Intern',
    company: 'CloudBridge',
    location: 'Remote',
    tag: 'Remote',
    stack: 'Kubernetes · Terraform · AWS',
    description: 'Help automate our CI/CD infrastructure and improve developer tooling across 12 product teams. Prior Linux experience required; cloud certs a bonus.',
  },
  {
    id: '6',
    role: 'Full Stack Engineer Intern',
    company: 'FinEdge',
    location: 'London, UK',
    tag: 'Hybrid',
    stack: 'Node.js · Vue · MongoDB',
    description: 'Build internal tools and customer-facing features for a fintech platform serving retail investors across Europe. Remote-friendly for 3 days a week.',
  },
];

async function main() {
  console.log('Seeding mock internships...');
  for (const item of ALL_INTERNSHIPS) {
    await prisma.internship.upsert({
      where: { id: item.id },
      update: {
        title: item.role,
        company: item.company,
        location: item.location,
        description: item.description,
        skills: [item.stack],
        hash: item.company + '-' + item.role,
      },
      create: {
        id: item.id,
        title: item.role,
        company: item.company,
        location: item.location,
        description: item.description,
        skills: [item.stack],
        hash: item.company + '-' + item.role,
      },
    });
  }
  console.log('Seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
