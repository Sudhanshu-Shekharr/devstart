import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * Drop-in replacement for next-auth's getServerSession.
 * Verifies Supabase session, retrieves/upserts the Prisma User,
 * and returns the session in the shape downstream code expects:
 * { user: { id: prismaUser.id, email: prismaUser.email, name?: string } }
 */
export async function getServerSession(authOptions?: any) {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user?.email) {
    return null;
  }

  const { user } = session;
  const email = user.email as string;
  const name = user.user_metadata?.name || user.user_metadata?.full_name || email.split('@')[0];

  // Lookup or create Prisma user by email, mirroring previous NextAuth behavior
  try {
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: {}, // Don't overwrite name on every login unless requested
      create: {
        email,
        name,
      },
    });

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
      },
    };
  } catch (err) {
    console.error('Failed to sync Supabase user to Prisma User table:', err);
    return null;
  }
}
