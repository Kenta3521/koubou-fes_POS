import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

export const getOrganizationList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const organizations = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                inviteCode: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json({
            success: true,
            data: organizations,
        });
    } catch (error) {
        next(error);
    }
};

export const getOrganizationSalesList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const organizations = await prisma.organization.findMany({
            select: { // Added select for organization fields
                id: true,
                name: true,
                transactions: {
                    where: {
                        status: 'COMPLETED',
                    },
                    select: {
                        totalAmount: true,
                    }
                }
            }
        });

        const data = organizations.map(org => {
            const totalSales = org.transactions.reduce((sum, txn) => sum + txn.totalAmount, 0);
            return {
                id: org.id,
                name: org.name,
                totalSales,
                transactionCount: org.transactions.length,
            };
        }).sort((a, b) => b.totalSales - a.totalSales);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
};

// --- System Role Management ---

/**
 * List all roles (System Admin context)
 * Supports filtering by organizationId
 */
export const listAllRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = req.query;

        const whereClause: any = {};
        if (organizationId && organizationId !== 'null' && organizationId !== 'common') { // Fixed condition
            whereClause.organizationId = organizationId as string;
        } else if (organizationId === 'null' || organizationId === 'common') {
            whereClause.organizationId = null;
        }

        const roles = await prisma.serviceRole.findMany({
            where: whereClause,
            include: {
                organization: { select: { name: true } },
                permissions: {
                    include: { permission: true }
                }
            },
            orderBy: [
                { organizationId: 'asc' }, // Common (null) first
                { name: 'asc' }
            ]
        });

        const formatted = roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystemRole: role.isSystemRole,
            organizationId: role.organizationId,
            organizationName: role.organization?.name || '共通ロール',
            permissions: role.permissions.map(rp => rp.permission.code)
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        next(error);
    }
};

/**
 * Create Role (System Admin context)
 */
export const createRoleSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, permissionCodes, organizationId } = req.body;

        if (!name) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'ロール名は必須です' }
            });
            return;
        }

        // Validate permissions
        const permissions = await prisma.permission.findMany({
            where: { code: { in: permissionCodes || [] } }
        });

        // Normalize organizationId
        const normalizedOrgId = (organizationId === 'null' || organizationId === 'common' || !organizationId) ? null : organizationId;
        const isSystemRole = normalizedOrgId === null;

        const role = await prisma.serviceRole.create({
            data: {
                name,
                description,
                organizationId: normalizedOrgId,
                isSystemRole,
                permissions: {
                    create: permissions.map(p => ({
                        permission: { connect: { id: p.id } }
                    }))
                }
            },
            include: { permissions: { include: { permission: true } } }
        });

        res.status(201).json({
            success: true,
            data: {
                id: role.id,
                name: role.name,
                description: role.description,
                organizationId: role.organizationId,
                permissions: role.permissions.map(rp => rp.permission.code)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Role (System Admin context)
 */
export const updateRoleSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { roleId } = req.params;
        const { name, description, permissionCodes } = req.body;

        const existing = await prisma.serviceRole.findUnique({ where: { id: roleId } });
        if (!existing) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'ロールが見つかりません' }
            });
            return;
        }

        await prisma.serviceRole.update({
            where: { id: roleId },
            data: { name, description }
        });

        if (permissionCodes) {
            await prisma.rolePermission.deleteMany({ where: { roleId } });

            const permissions = await prisma.permission.findMany({
                where: { code: { in: permissionCodes } }
            });

            await prisma.rolePermission.createMany({
                data: permissions.map(p => ({ roleId, permissionId: p.id }))
            });
        }

        const updated = await prisma.serviceRole.findUnique({
            where: { id: roleId },
            include: { permissions: { include: { permission: true } } }
        });

        res.json({
            success: true,
            data: {
                id: updated!.id,
                name: updated!.name,
                description: updated!.description,
                organizationId: updated!.organizationId,
                permissions: updated!.permissions.map(rp => rp.permission.code)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Role (System Admin context)
 */
export const deleteRoleSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { roleId } = req.params;

        const usageCount = await prisma.userOrganizationRole.count({ where: { roleId } });
        if (usageCount > 0) {
            res.status(400).json({
                success: false,
                error: { code: 'ROLE_IN_USE', message: `このロールは ${usageCount} 名のユーザーに使用されています。削除できません。` }
            });
            return;
        }

        await prisma.rolePermission.deleteMany({ where: { roleId } });
        await prisma.serviceRole.delete({ where: { id: roleId } });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * List all permissions (System Admin context)
 * GET /api/v1/admin/permissions
 */
export const fetchAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ category: 'asc' }, { code: 'asc' }]
        });
        res.json({ success: true, data: permissions });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Permission Metadata (System Admin context)
 * PUT /api/v1/admin/permissions/:id
 */
export const updatePermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { description } = req.body; // Only description is editable for now

        if (!description) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '説明は必須です' } });
            return;
        }

        const updated = await prisma.permission.update({
            where: { id },
            data: { description }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
