import process from "node:process";

process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason: any) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

console.log('Starting server...');
try {
    import('./Server.js');
} catch (error) {
    console.error(error);
    process.exit(1);
}