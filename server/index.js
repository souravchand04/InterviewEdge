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

app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Interview Edge API is running" });
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);  
app.use("/api/interview", interviewRouter); 
app.use("/api/payment", PaymentRouter); 

// Connect to MongoDB (cached by Mongoose across serverless warm starts)
connectDB().catch(err => console.error("MongoDB connection failed:", err));

// Only start the server when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on PORT ${PORT}`);
    });
}

export default app;