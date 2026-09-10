"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health & root routes (accessible immediately without waiting for DB)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/', (_req, res) => {
    res.send('Dogecoin Mobile Backend API');
});
// Ensure DB is connected before handling API requests (required for Vercel serverless)
app.use(async (_req, res, next) => {
    try {
        await (0, db_1.default)();
        next();
    }
    catch (error) {
        console.error('Database connection failed:', error.message);
        res.status(503).json({ message: 'Database connection failed. Please try again.' });
        return;
    }
});
// Routes
app.use('/api', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/transactions', transactionRoutes_1.default);
app.use('/api/support', supportRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Start Server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
// Export for both ESM and CommonJS / Vercel Serverless Function compatibility
module.exports = app;
module.exports.default = app;
exports.default = app;
