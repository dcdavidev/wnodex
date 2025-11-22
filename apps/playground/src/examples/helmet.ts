import { Wnodex, WnodexConfigInput } from 'wnodex';

const HELMET_OPTIONS: WnodexConfigInput['helmet'] = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
};

// WNODEX instance
const wnodex = new Wnodex({
  port: 4000,
  helmet: HELMET_OPTIONS,
});

const logger = wnodex.getLogger();

// Add a simple health check route
const app = wnodex.getApp();
app.get('/', (_req, res) => res.send('OK'));

// Start the server
wnodex.start().then(() => {
  logger.info('Playground server started!');
});

// Shutdown chores
const shutdown = async () => {
  await wnodex.shutdown(() => {
    // DB disconnection or other chores
    logger.info('Chores executed.');
  });
};

// Graceful shutdown on SIGINT/SIGTERM using Wnodex public method
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
