import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Singleton rate-limiter for public read endpoints.
 *
 * Sliding window: 25 requests / 60 seconds per IP.
 * Instantiated outside the handler so the ephemeral in-process cache
 * (which avoids redundant Redis round-trips for already-blocked IPs)
 * survives across warm invocations.
 */
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(25, '60 s'),
  prefix: 'devstart:rl',
  analytics: false,
});
