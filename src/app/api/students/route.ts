import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function GET() {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  await db.user.updateMany({
    where: { createdBy: teacher.id, role: 'STUDENT', NOT: { courseSlug: teacher.courseSlug } },
    data: { courseSlug: teacher.courseSlug },
  })

  const students = await db.user.findMany({
    where: { createdBy: teacher.id, role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { attempts: { where: { status: 'SUBMITTED' } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(students)
}

export async function POST(request: NextRequest) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password } = parsed.data
  const adminClient = createAdminClient()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'STUDENT' },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Auth user creation failed' }, { status: 400 })
  }

  try {
    const student = await db.user.create({
      data: { id: authData.user.id, email, name, role: 'STUDENT', createdBy: teacher.id, courseSlug: teacher.courseSlug },
    })
    return NextResponse.json(student, { status: 201 })
  } catch {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Failed to create student record' }, { status: 500 })
  }
}
