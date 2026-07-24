import { prisma } from '../src/lib/prisma';
import { generateInternshipHash } from '../src/lib/hash';

export async function seedInternships() {
  const items = [
    {
      title: 'Frontend React Developer Intern',
      company: 'Vercel',
      domain: ['frontend'],
      skills: ['React', 'Next.js', 'TypeScript', 'Tailwind'],
      location: 'Remote',
      stipend: '$40/hr',
      applyUrl: 'https://vercel.com/careers/intern-frontend',
      source: 'Devstart Seed',
      description: 'Build modern Next.js web applications and UI components.',
    },
    {
      title: 'Machine Learning AI Intern',
      company: 'OpenAI',
      domain: ['ml'],
      skills: ['Python', 'PyTorch', 'TensorFlow', 'Machine Learning', 'Scikit-Learn'],
      location: 'Remote',
      stipend: '$50/hr',
      applyUrl: 'https://openai.com/careers/intern-ml',
      source: 'Devstart Seed',
      description: 'Work on cutting-edge LLMs, fine-tuning, and neural network training.',
    },
    {
      title: 'Backend Systems Engineer Intern',
      company: 'Uber',
      domain: ['backend'],
      skills: ['Go', 'PostgreSQL', 'Docker', 'gRPC'],
      location: 'Hybrid',
      stipend: '$45/hr',
      applyUrl: 'https://uber.com/careers/intern-backend',
      source: 'Devstart Seed',
      description: 'Scale microservices and high-throughput database systems.',
    },
    {
      title: 'Full Stack Web Intern',
      company: 'Stripe',
      domain: ['fullstack', 'frontend', 'backend'],
      skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Prisma'],
      location: 'Remote',
      stipend: '$48/hr',
      applyUrl: 'https://stripe.com/careers/intern-fullstack',
      source: 'Devstart Seed',
      description: 'Develop end-to-end payment dashboards and node services.',
    },
  ];

  for (const item of items) {
    const hash = generateInternshipHash(item.company, item.title, item.location || 'Remote');
    await prisma.internship.upsert({
      where: { hash },
      update: item,
      create: { ...item, hash },
    });
  }

  console.log('Seed completed: 4 internships inserted/updated.');
}

if (require.main === module) {
  seedInternships()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
