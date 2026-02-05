import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: (requestOrigin, callback) => {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!requestOrigin) return callback(null, true);
                // Allow any origin in development
                callback(null, true);
            },
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join_transaction', (transactionId: string) => {
            console.log(`Socket ${socket.id} joined transaction room: ${transactionId}`);
            socket.join(`transaction:${transactionId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
