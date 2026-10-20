
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'

dotenv.config({ path: '.env.local' })

async function main() {
  // Load auth and database modules only after environment variables are loaded.
  const { auth } = await import('../lib/auth')
  const { db, pool } = await import('../lib/db')
  const { classes, user } = await import('../lib/db/schema')

  const accounts = [
    {
      name: 'Attendly Administrator',
      email: 'admin@attendly.demo',
      password: process.env.SEED_ADMIN_PASSWORD,
      role: 'admin',
    },
    {
      name: 'Aditi Sharma',
      email: 'aditi.sharma@attendly.demo',
      password: process.env.SEED_TEACHER1_PASSWORD,
      role: 'teacher',
      chapter: 'Chapter 1 - Introduction to DBMS',
      code: 'DBMS-CH1',
    },
    {
      name: 'Rohan Patil',
      email: 'rohan.patil@attendly.demo',
      password: process.env.SEED_TEACHER2_PASSWORD,
      role: 'teacher',
      chapter: 'Chapter 2 - SQL and Queries',
      code: 'DBMS-CH2',
    },
    {
      name: 'Neha Kulkarni',
      email: 'neha.kulkarni@attendly.demo',
      password: process.env.SEED_TEACHER3_PASSWORD,
      role: 'teacher',
      chapter: 'Chapter 3 - Database Normalization',
      code: 'DBMS-CH3',
    },
  ] as const

  try {
    for (const item of accounts) {
      if (!item.password || item.password.length < 8) {
        throw new Error(
          `Set a password of at least 8 characters for ${item.email}`,
        )
      }
    }

    for (const item of accounts) {
      let [existing] = await db
        .select()
        .from(user)
        .where(eq(user.email, item.email))
        .limit(1)

      if (!existing) {
        const result = await auth.api.signUpEmail({
          body: {
            name: item.name,
            email: item.email,
            password: item.password ?? '',
          },
        })

        if (!result?.user?.id) {
          throw new Error(`Could not create ${item.email}`)
        }

        ;[existing] = await db
          .select()
          .from(user)
          .where(eq(user.id, result.user.id))
          .limit(1)

        if (!existing) {
          throw new Error(`Created user was not found: ${item.email}`)
        }
      }

      // Elevated roles are assigned only by this trusted server-side script.
      await db
        .update(user)
        .set({ role: item.role, updatedAt: new Date() })
        .where(eq(user.id, existing.id))

      if (item.role === 'teacher') {
        const [existingClass] = await db
          .select()
          .from(classes)
          .where(eq(classes.code, item.code))
          .limit(1)

        if (existingClass) {
          if (existingClass.teacherId !== existing.id) {
            throw new Error(
              `Class ${item.code} already belongs to another teacher. Resolve it manually.`,
            )
          }
        } else {
          await db.insert(classes).values({
            name: item.chapter,
            code: item.code,
            section: 'A',
            teacherId: existing.id,
          })
        }
      }

      console.log(`Ready: ${item.email} (${item.role})`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Account seeding failed:', error)
  process.exitCode = 1
})
