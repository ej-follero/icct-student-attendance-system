import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/services/audit.service';
import { existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Cron endpoint for scheduled cleanup tasks
 * Runs daily at 2:00 AM UTC as configured in vercel.json
 * 
 * Cleanup tasks:
 * 1. Clean old audit logs (older than 365 days by default)
 * 2. Clean old report files from /tmp/reports and public/reports
 * 3. Clean old backup files based on retention policy
 * 4. Clean old temporary files
 */
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (optional security check)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In production, Vercel sets this header automatically, but we can verify
    // For now, allow if no CRON_SECRET is set (development/testing)
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    tasks: {
      auditLogs: { deleted: 0, error: null as string | null },
      reportFiles: { deleted: 0, errors: [] as string[] },
      backupFiles: { deleted: 0, error: null as string | null },
      tempFiles: { deleted: 0, errors: [] as string[] },
    },
  };

  try {
    // Task 1: Clean old audit logs (keep last 365 days)
    try {
      const auditLogsDeleted = await auditService.cleanOldLogs(365);
      results.tasks.auditLogs.deleted = auditLogsDeleted;
    } catch (error: any) {
      results.tasks.auditLogs.error = error.message;
      console.error('Error cleaning audit logs:', error);
    }

    // Task 2: Clean old report files
    try {
      const reportCleanupResult = await cleanOldReportFiles();
      results.tasks.reportFiles.deleted = reportCleanupResult.deleted;
      results.tasks.reportFiles.errors = reportCleanupResult.errors;
    } catch (error: any) {
      results.tasks.reportFiles.errors.push(error.message);
      console.error('Error cleaning report files:', error);
    }

    // Task 3: Clean old backup files (if backup scheduler exists)
    try {
      const backupCleanupResult = await cleanOldBackupFiles();
      results.tasks.backupFiles.deleted = backupCleanupResult.deleted;
      if (backupCleanupResult.error) {
        results.tasks.backupFiles.error = backupCleanupResult.error;
      }
    } catch (error: any) {
      results.tasks.backupFiles.error = error.message;
      console.error('Error cleaning backup files:', error);
    }

    // Task 4: Clean old temporary files
    try {
      const tempCleanupResult = await cleanOldTempFiles();
      results.tasks.tempFiles.deleted = tempCleanupResult.deleted;
      results.tasks.tempFiles.errors = tempCleanupResult.errors;
    } catch (error: any) {
      results.tasks.tempFiles.errors.push(error.message);
      console.error('Error cleaning temp files:', error);
    }

    // Log cleanup completion
    await auditService.logSystemEvent(
      'SYSTEM_CLEANUP',
      'Cron',
      `Deleted: ${results.tasks.auditLogs.deleted} audit logs, ${results.tasks.reportFiles.deleted} report files, ${results.tasks.backupFiles.deleted} backup files, ${results.tasks.tempFiles.deleted} temp files`,
      'LOW'
    );

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('Cleanup cron job failed:', error);
    results.success = false;
    return NextResponse.json(
      { ...results, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Clean old report files from /tmp/reports and public/reports
 * Deletes files older than 30 days
 */
async function cleanOldReportFiles(): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  const daysToKeep = 30;
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  const reportDirs = [
    '/tmp/reports', // Vercel serverless temp directory
    join(process.cwd(), 'public', 'reports'), // Local public reports
  ];

  for (const dir of reportDirs) {
    try {
      if (!existsSync(dir)) {
        continue; // Directory doesn't exist, skip
      }

      const files = readdirSync(dir);
      for (const file of files) {
        try {
          const filePath = join(dir, file);
          const stats = statSync(filePath);
          
          if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
            unlinkSync(filePath);
            deleted++;
          }
        } catch (fileError: any) {
          errors.push(`Failed to delete ${file}: ${fileError.message}`);
        }
      }
    } catch (dirError: any) {
      errors.push(`Failed to access ${dir}: ${dirError.message}`);
    }
  }

  // Also clean up ReportLog entries with old filepaths that no longer exist
  try {
    const oldReports = await prisma.reportLog.findMany({
      where: {
        createdAt: {
          lt: new Date(cutoffTime),
        },
        filepath: {
          not: null,
        },
      },
      select: {
        reportId: true,
        filepath: true,
      },
    });

    for (const report of oldReports) {
      if (report.filepath) {
        try {
          const filePath = report.filepath.startsWith('/')
            ? report.filepath
            : join(process.cwd(), report.filepath);
          
          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            if (stats.mtime.getTime() < cutoffTime) {
              unlinkSync(filePath);
              deleted++;
            }
          }
          
          // Remove filepath from database if file doesn't exist
          await prisma.reportLog.update({
            where: { reportId: report.reportId },
            data: { filepath: null },
          });
        } catch (error: any) {
          // File might not exist, which is fine
          await prisma.reportLog.update({
            where: { reportId: report.reportId },
            data: { filepath: null },
          });
        }
      }
    }
  } catch (dbError: any) {
    errors.push(`Database cleanup error: ${dbError.message}`);
  }

  return { deleted, errors };
}

/**
 * Clean old backup files based on retention policy
 */
async function cleanOldBackupFiles(): Promise<{ deleted: number; error: string | null }> {
  try {
    // Get backup settings to determine retention policy
    const backupSettings = await prisma.backupSettings.findFirst();
    if (!backupSettings || !backupSettings.retentionDays) {
      return { deleted: 0, error: null }; // No retention policy set
    }

    const cutoffDate = new Date(
      Date.now() - backupSettings.retentionDays * 24 * 60 * 60 * 1000
    );

    // Find old backups
    const oldBackups = await prisma.systemBackup.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        location: 'LOCAL', // Only clean local backups, cloud backups are handled separately
      },
      select: {
        id: true,
        filePath: true,
      },
    });

    let deleted = 0;
    for (const backup of oldBackups) {
      if (backup.filePath) {
        try {
          const filePath = backup.filePath.startsWith('/')
            ? backup.filePath
            : join(process.cwd(), backup.filePath);
          
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            deleted++;
          }
        } catch (error: any) {
          console.error(`Failed to delete backup file ${backup.id}:`, error);
        }
      }

      // Delete backup record from database
      try {
        await prisma.systemBackup.delete({
          where: { id: backup.id },
        });
        deleted++;
      } catch (error: any) {
        console.error(`Failed to delete backup record ${backup.id}:`, error);
      }
    }

    return { deleted, error: null };
  } catch (error: any) {
    return { deleted: 0, error: error.message };
  }
}

/**
 * Clean old temporary files from various temp directories
 */
async function cleanOldTempFiles(): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  const daysToKeep = 7; // Keep temp files for 7 days
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  const tempDirs = [
    '/tmp', // Vercel serverless temp
    join(process.cwd(), 'tmp'), // Local temp
    join(process.cwd(), 'public', 'uploads', 'temp'), // Upload temp files
  ];

  for (const dir of tempDirs) {
    try {
      if (!existsSync(dir)) {
        continue;
      }

      const files = readdirSync(dir);
      for (const file of files) {
        try {
          const filePath = join(dir, file);
          const stats = statSync(filePath);
          
          if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
            unlinkSync(filePath);
            deleted++;
          }
        } catch (fileError: any) {
          errors.push(`Failed to delete temp file ${file}: ${fileError.message}`);
        }
      }
    } catch (dirError: any) {
      // Skip if directory doesn't exist or can't be accessed
      if (!dirError.message.includes('ENOENT')) {
        errors.push(`Failed to access ${dir}: ${dirError.message}`);
      }
    }
  }

  return { deleted, errors };
}

