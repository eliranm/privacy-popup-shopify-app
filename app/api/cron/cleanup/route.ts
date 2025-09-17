import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const results = {
      expiredSessions: 0,
      oldAuditLogs: 0,
      orphanedSettings: 0,
    };

    // Clean up expired sessions
    const expiredSessionsResult = await db.cleanupExpiredSessions();
    results.expiredSessions = expiredSessionsResult.count || 0;

    // Clean up old audit logs (keep last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const oldLogsResult = await db.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });
    results.oldAuditLogs = oldLogsResult.count;

    // Clean up settings for shops that no longer exist
    const orphanedSettingsResult = await db.prisma.setting.deleteMany({
      where: {
        shop: null,
      },
    });
    results.orphanedSettings = orphanedSettingsResult.count;

    console.log('Cleanup completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup cron job failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
