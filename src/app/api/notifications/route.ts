import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple cache for notifications
const notificationsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// GET /api/notifications
// Query params: isRead (true|false), type, priority, limit, cursor
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const isReadParam = searchParams.get('isRead');
    const type = searchParams.get('type') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 20)));
    const cursor = searchParams.get('cursor') || undefined;

    // Create cache key
    const cacheKey = `${userId}-${isReadParam || 'all'}-${type || 'all'}-${priority || 'all'}-${limit}-${cursor || 'first'}`;
    
    // Check cache first
    const cached = notificationsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    const where: any = { userId };
    if (isReadParam === 'true') where.isRead = true;
    if (isReadParam === 'false') where.isRead = false;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),
    });

    const nextCursor = notifications.length === limit ? notifications[notifications.length - 1].id : null;
    const result = { data: notifications, nextCursor };
    
    // Cache the result
    notificationsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH /api/notifications -> mark all as read for current user
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });

    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update notifications' }, { status: 500 });
  }
}

// duplicate block removed
