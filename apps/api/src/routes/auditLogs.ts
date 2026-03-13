import { Router } from 'express';
import { getOrgAuditLogs, exportOrgAuditLogsCsv, getSystemAuditLogs, exportSystemAuditLogsCsv } from '../controllers/auditController.js';
import { authenticate, requireSystemAdmin, requireOrgRole } from '../middlewares/auth.js';
import { Role } from '@koubou-fes-pos/shared';

const router: Router = Router();

// 全てのエンドポイントでログイン必須
router.use(authenticate);

// システム管理者用: 全ログ取得
router.get('/admin', requireSystemAdmin, getSystemAuditLogs);

// システム管理者用: CSVエクスポート
router.get('/admin/export', requireSystemAdmin, exportSystemAuditLogsCsv);

// 団体管理者用: 団体ログ取得
// 閲覧権限は ADMIN (管理者) または MANAGER (運営) とする
// ※ Roleの定義が不明確な場合は一旦 ADMIN のみ、あるいは標準的なロールを指定
router.get('/organizations/:orgId', requireOrgRole([Role.ADMIN]), getOrgAuditLogs);

// 団体管理者用: CSVエクスポート
router.get('/organizations/:orgId/export', requireOrgRole([Role.ADMIN]), exportOrgAuditLogsCsv);

export default router;
