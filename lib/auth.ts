
import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

export const auth = betterAuth({
  database: pool,

  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ??
          'http://localhost:3000'),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
        input: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (data) => ({
          data: {
            ...data,
            role: 'student',
          },
        }),
      },
    },
  },

  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          ...(process.env.V0_RUNTIME_URL
            ? [process.env.V0_RUNTIME_URL]
            : []),
          ...(process.env.V0_DEV_APP_URL
            ? [process.env.V0_DEV_APP_URL]
            : []),
          ...(process.env.V0_BUILD_URL
            ? [process.env.V0_BUILD_URL]
            : []),
          ...(process.env.V0_SANDBOX_URL
            ? [process.env.V0_SANDBOX_URL]
            : []),
        ]
      : []),

    ...(process.env.NODE_ENV === 'production'
      ? [
          ...(process.env.VERCEL_URL
            ? [`https://${process.env.VERCEL_URL}`]
            : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [
                `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
              ]
            : []),
        ]
      : []),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
