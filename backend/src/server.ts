import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/db';

dotenv.config();
import { config } from './config/env';

const app: Express = express();
const port = config.PORT || 5000;

// Middleware
const allowedOrigins = [
    'https://algo-forge-2-0.vercel.app',
    'https://algoforge-2-0.onrender.com',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    config.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // allow server-to-server (no origin) or listed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Remove Express fingerprint header
app.disable('x-powered-by');

// Security headers config
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc: ["'none'"],
            scriptSrc: ["'none'"],
            connectSrc: ["'self'"],
            imgSrc: ["'self'"],
            styleSrc: ["'none'"],
            frameAncestors: ["'none'"],
            formAction: ["'none'"],
        }
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    } : false,
    xssFilter: true,
}));

// Permissions-Policy header configuration
app.use((req, res, next) => {
    res.setHeader(
        'Permissions-Policy',
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );
    next();
});

app.use(express.json());

// Trust the first proxy hop (Render / reverse proxies) so req.ip reflects the
// real client IP from X-Forwarded-For instead of the proxy IP. Without this,
// IP-based rate limiting and abuse detection would bucket all traffic under
// the proxy's address.
app.set('trust proxy', 1);

// Database Connection
connectDB();

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';

app.use('/api/users', authRoutes);
app.use('/api/users', userRoutes);

import infoRoutes from './routes/infoRoutes';
import contentRoutes from './routes/contentRoutes';

import userActionRoutes from './routes/userActionRoutes';
import chatRoutes from './routes/chatRoutes';
import forumRoutes from './routes/forumRoutes';
import adminRoutes from './routes/adminRoutes';

app.use('/api/info', infoRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/user-actions', userActionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('AlgoForge API is running');
});

app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is healthy' });
});

let server: any;
if (process.env.NODE_ENV !== 'test') {
    server = app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
}

export { app, server };
