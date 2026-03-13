import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import organizationRoutes from './routes/organizations.js';
import permissionsRoutes from './routes/permissions.js';



// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger();

// Security middleware
app.use(helmet());
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 10000 : 2000, // 開発時は大幅に緩和
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Body parsing middleware
// Capture raw body for webhook signature verification
app.use(express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/permissions', permissionsRoutes);
import webhookRoutes from './routes/webhooks.js';
app.use('/api/v1/webhooks', webhookRoutes);
import adminRoutes from './routes/admin.js';
app.use('/api/v1/admin', adminRoutes);
import auditLogsRoutes from './routes/auditLogs.js';
app.use('/api/v1/audit-logs', auditLogsRoutes);




app.get('/api/v1', (_req: Request, res: Response) => {
    res.json({
        message: '光芒祭POSシステム API',
        version: '1.0.0',
        status: 'Phase1: 基盤構築中',
    });
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
        },
    });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal server error occurred',
        },
    });
});

// Start server
import { createServer } from 'http';
import { initSocket } from './lib/socket.js';

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔌 API endpoint: http://localhost:${PORT}/api/v1`);
});

// Graceful shutdown
import { closePrisma } from './utils/prisma.js';

const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    httpServer.close(async () => {
        logger.info('HTTP server closed.');
        try {
            await closePrisma();
            logger.info('Prisma connection closed.');
            process.exit(0);
        } catch (err) {
            logger.error('Error during shutdown:', err);
            process.exit(1);
        }
    });

    // Forced shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
