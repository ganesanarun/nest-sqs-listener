import express, {Request, Response} from 'express';
import {SqsManager} from './sqs-manager';

/**
 * Create and configure Express application
 */
export function createApp(sqsManager: SqsManager) {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'express-sqs-listener',
        });
    });

    // Status endpoint
    app.get('/status', (req: Request, res: Response) => {
        res.json({
            status: 'running',
            listeners: 'active',
            timestamp: new Date().toISOString(),
        });
    });

    // Root endpoint
    app.get('/', (req: Request, res: Response) => {
        res.json({
            message: 'Express SQS Listener Example',
            endpoints: {
                health: '/health',
                status: '/status',
            },
        });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            error: 'Not Found',
            path: req.path,
        });
    });

    // Error handler
    app.use((err: Error, req: Request, res: Response, next: any) => {
        console.error('Express error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
        });
    });

    return app;
}
