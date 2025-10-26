export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 10)));

  // Build a safe where clause based on fields we've seen in your DB
  // (studentIdNum, firstName, lastName). We won’t touch your schema.
  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { studentIdNum: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  try {
    const [total, items] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          studentId: true,
          studentIdNum: true,
          firstName: true,
          lastName: true,
          // If you want to display more fields later, add them here
        },
      }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e: any) {
    console.error('GET /api/students error:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to fetch students' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
