import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiRequireRole, apiAuth } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  durationMins: z.number().optional(),
  marksCorrect: z.number().optional(),
  marksWrong: z.number().optional(),
  isPublished: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth()
  if ('error' in auth) return auth.error
  const { user } = auth

  const mock = await db.mock.findUnique({
    where: { id: params.id },
    include: {
      subject: true,
      questions: {
        include: {
          chapter: true,
          options: {
            select: {
              id: true,
              questionId: true,
              text: true,
              imageUrl: true,
              ...(user.role === 'TEACHER' ? { isCorrect: true } : {}),
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!mock) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'STUDENT' && !mock.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(mock)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const mock = await db.mock.findUnique({ where: { id: params.id } })
  if (!mock || mock.createdBy !== teacher.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await db.mock.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiRequireRole('TEACHER')
  if ('error' in auth) return auth.error
  const { user: teacher } = auth

  const mock = await db.mock.findUnique({ where: { id: params.id } })
  if (!mock || mock.createdBy !== teacher.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.mock.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
