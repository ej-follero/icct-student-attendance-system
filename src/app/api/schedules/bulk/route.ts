import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    // JWT Authentication - Admin only
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Check user exists and is active
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { status: true, role: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Admin-only access control
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { scheduleIds, action, data } = await request.json();

    if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schedule IDs are required' },
        { status: 400 }
      );
    }

    if (!action || !['activate', 'deactivate', 'bulkEdit', 'archive', 'bulkStatusChange'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be activate, deactivate, bulkEdit, archive, or bulkStatusChange' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    let message = '';

    switch (action) {
      case 'activate':
        updateData = { status: 'ACTIVE' };
        message = `Successfully activated ${scheduleIds.length} schedule(s)`;
        break;
      case 'deactivate':
        // Deactivate: Set status to CANCELLED but keep deletedAt as null (temporary deactivation, not deletion)
        updateData = { status: 'CANCELLED', deletedAt: null };
        message = `Successfully deactivated ${scheduleIds.length} schedule(s)`;
        break;
      case 'bulkEdit':
        if (!data) {
          return NextResponse.json(
            { success: false, error: 'Data is required for bulk edit' },
            { status: 400 }
          );
        }
        updateData = { ...data };
        message = `Successfully updated ${scheduleIds.length} schedule(s)`;
        break;
      case 'archive':
        // Archive: Set status to CANCELLED but keep deletedAt as null (archived records are kept for reference)
        updateData = { status: 'CANCELLED', deletedAt: null };
        message = `Successfully archived ${scheduleIds.length} schedule(s) (can be restored)`;
        break;
      case 'bulkStatusChange':
        if (!data?.status) {
          return NextResponse.json(
            { success: false, error: 'Status is required for bulk status change' },
            { status: 400 }
          );
        }
        updateData = { status: data.status };
        message = `Successfully changed status to ${data.status} for ${scheduleIds.length} schedule(s)`;
        break;
    }

    // Update schedules in bulk
    const result = await prisma.subjectSchedule.updateMany({
      where: {
        subjectSchedId: {
          in: scheduleIds.map(id => parseInt(id))
        }
      },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message,
      count: result.count
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update schedules'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // JWT Authentication - Admin only
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Check user exists and is active
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { status: true, role: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Admin-only access control
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { scheduleIds, action } = await request.json();

    if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schedule IDs are required' },
        { status: 400 }
      );
    }

    if (!action || !['duplicate', 'export'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be duplicate or export' },
        { status: 400 }
      );
    }

    if (action === 'duplicate') {
      // Fetch the schedules to duplicate
      const schedules = await prisma.subjectSchedule.findMany({
        where: {
          subjectSchedId: {
            in: scheduleIds.map(id => parseInt(id))
          }
        },
        include: {
          subject: true,
          section: true,
          instructor: true,
          room: true,
          semester: true,
        }
      });

      // Create duplicates with modified names
      const duplicates = await Promise.all(
        schedules.map(async (schedule) => {
          return await prisma.subjectSchedule.create({
            data: {
              subjectId: schedule.subjectId,
              sectionId: schedule.sectionId,
              instructorId: schedule.instructorId,
              roomId: schedule.roomId,
              day: schedule.day,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              slots: schedule.slots,
              scheduleType: schedule.scheduleType,
              status: 'ACTIVE', // New duplicates are active
              semesterId: schedule.semesterId,
              academicYear: schedule.academicYear,
              isRecurring: schedule.isRecurring,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              maxStudents: schedule.maxStudents,
              notes: schedule.notes ? `${schedule.notes} (Copy)` : 'Copy',
            }
          });
        })
      );

      return NextResponse.json({
        success: true,
        message: `Successfully duplicated ${duplicates.length} schedule(s)`,
        count: duplicates.length
      });
    }

    if (action === 'export') {
      // Fetch schedules for export
      const schedules = await prisma.subjectSchedule.findMany({
        where: {
          subjectSchedId: {
            in: scheduleIds.map(id => parseInt(id))
          }
        },
        include: {
          subject: true,
          section: true,
          instructor: true,
          room: true,
          semester: true,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Export data for ${schedules.length} schedule(s)`,
        data: schedules
      });
    }

  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform bulk action'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // JWT Authentication - Admin only
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Check user exists and is active
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { status: true, role: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Admin-only access control
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { scheduleIds } = await request.json();

    if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schedule IDs are required' },
        { status: 400 }
      );
    }

    // Soft delete schedules in bulk - update status to "CANCELLED" and set deletedAt timestamp
    const result = await prisma.subjectSchedule.updateMany({
      where: {
        subjectSchedId: {
          in: scheduleIds.map(id => parseInt(id))
        }
      },
      data: {
        status: 'CANCELLED',
        deletedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully soft deleted ${result.count} schedule(s) (can be restored)`,
      count: result.count
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete schedules'
      },
      { status: 500 }
    );
  }
}
