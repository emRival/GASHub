import dotenv from 'dotenv';
dotenv.config(); // Load env vars BEFORE importing app

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        credentials: true,
    },
});

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

// Export io for use in routes
export { io };

httpServer.listen(PORT, () => {
    console.log(`🚀 GAS Bridge Hub API running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth/*`);
    console.log(`🔌 WebSocket server ready`);
});
