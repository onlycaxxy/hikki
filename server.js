import express from 'express';
import cors from 'cors';
import config, { validateConfig, getConfigSummary } from './src/config/config.js';
import mapRoutes from './src/routes/mapRoutes.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';

/**
 * LLM Map Proxy Server
 * A modular Node.js proxy server that converts natural language prompts
 * into structured knowledge maps using various LLM providers.
 */

// Initialize Express app
const app = express();

// Middleware setup
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static('dist'));

// Request logging middleware (development only)
if (config.server.env === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// API routes
app.use(config.api.prefix, mapRoutes);

// Catch-all: serve index.html for non-API routes (SPA routing)
app.get('*', (req, res, next) => {
  // Don't catch API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile('dist/index.html', { root: '.' });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Server startup
function startServer() {
  try {
    // Validate configuration
    validateConfig();

    // Start listening
    const server = app.listen(config.server.port, config.server.host, () => {
      console.log('\n=================================');
      console.log('🚀 LLM Map Proxy Server Started');
      console.log('=================================');
      console.log(`Environment: ${config.server.env}`);
      console.log(`Listening: http://${config.server.host}:${config.server.port}`);
      console.log(`API Prefix: ${config.api.prefix}`);
      console.log('\nConfiguration:');
      console.log(JSON.stringify(getConfigSummary(), null, 2));
      console.log('\n=================================\n');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Server startup failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

// Export for testing
export { app, startServer };
export default app;
