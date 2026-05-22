import express from 'express';
import connectDB from './config/connectDb.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from './routes/auth.route.js';
import userRouter from './routes/user.route.js';
import interviewRouter from './routes/interview.route.js';
import PaymentRouter from './routes/payment.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const configuredOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [
    ...configuredOrigins,
    'https://ai-interview-agent-client-bgax.onrender.com',
    'https://ai-interview-agent-1-0h0w.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174'
];

app.use(cors({
    origin: function(origin, callback) {
        // allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        } else {
            return callback(new Error('CORS policy: This origin is not allowed'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json());
app.use(cookieParser());

let dbConnectionPromise;

const ensureDbConnected = async (req, res, next) => {
    try {
        dbConnectionPromise ??= connectDB();
        await dbConnectionPromise;
        next();
    } catch (error) {
        console.error("Database connection failed:", error);
        dbConnectionPromise = undefined;
        return res.status(500).json({ message: "Database connection failed" });
    }
};

app.get('/', (req, res) => {
    res.send('API is running successfully on Vercel!');
});

app.use("/api", ensureDbConnected);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);  
app.use("/api/interview", interviewRouter); 
app.use("/api/payment", PaymentRouter); 

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on PORT ${PORT}`);
    });
}

// Export for Vercel serverless
export default app;
