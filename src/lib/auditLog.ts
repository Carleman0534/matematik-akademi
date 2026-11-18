import { getDb, saveDb } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export async function logAuditEvent(entry: {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}): Promise<string> {
  try {
    const db = await getDb();
    const id = `audit-${uuidv4().slice(0, 8)}`;
    const detailsStr = typeof entry.details === 'object' && entry.details !== null
      ? JSON.stringify(entry.details)
      : (entry.details || null);

    db.run(
      `INSERT INTO system_audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        entry.userId || null,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        detailsStr,
        entry.ipAddress || '127.0.0.1'
      ]
    );

    saveDb(db);
    return id;
  } catch (err) {
    console.error('Failed to log audit event:', err);
    return '';
  }
}

export async function getAuditLogs(options?: {
  limit?: number;
  action?: string;
  resourceType?: string;
}): Promise<AuditLogEntry[]> {
  try {
    const db = await getDb();
    const limit = options?.limit || 50;
    let query = `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, created_at
                 FROM system_audit_logs WHERE 1=1`;
    const params: (string | number)[] = [];

    if (options?.action) {
      query += ` AND action = ?`;
      params.push(options.action);
    }
    if (options?.resourceType) {
      query += ` AND resource_type = ?`;
      params.push(options.resourceType);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    stmt.bind(params);

    const results: AuditLogEntry[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let parsedDetails = null;
      if (row.details && typeof row.details === 'string') {
        try {
          parsedDetails = JSON.parse(row.details);
        } catch {
          parsedDetails = row.details;
        }
      }

      results.push({
        id: String(row.id),
        userId: row.user_id ? String(row.user_id) : null,
        action: String(row.action),
        resourceType: String(row.resource_type),
        resourceId: row.resource_id ? String(row.resource_id) : null,
        details: parsedDetails,
        ipAddress: row.ip_address ? String(row.ip_address) : null,
        createdAt: String(row.created_at)
      });
    }
    stmt.free();

    return results;
  } catch (err) {
    console.error('Failed to get audit logs:', err);
    return [];
  }
}
