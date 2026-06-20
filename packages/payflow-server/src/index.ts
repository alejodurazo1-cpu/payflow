import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PayFlowClient } from '@payflow/sdk';
import type { PaymentRequest, MerchantConfig } from '@payflow/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });
const localMode = process.env.PAYFLOW_MODE !== 'live';

const client = new PayFlowClient({
  stripe: {
    apiKey: process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder',
    sandbox: true,
    local: localMode,
  },
  paypal: {
    apiKey: process.env.PAYPAL_CLIENT_ID ?? 'test',
    webhookSecret: process.env.PAYPAL_SECRET ?? 'test',
    sandbox: true,
    local: localMode,
  },
});

client.registerMerchant({
  id: 'merchant_1',
  name: 'Demo Merchant',
  preferredProcessors: ['stripe', 'paypal'],
  maxFeeRate: 0.035,
  requireBackup: true,
});

await app.register(cors, { origin: true });

app.post('/api/charge', async (req, reply) => {
  const body = req.body as PaymentRequest;
  try {
    const result = await client.processPayment(body);
    return reply.send(result);
  } catch (err) {
    return reply.status(500).send({
      error: err instanceof Error ? err.message : 'Payment processing failed',
    });
  }
});

app.post('/api/merchants', async (req, reply) => {
  const config = req.body as MerchantConfig;
  client.registerMerchant(config);
  return reply.send({ ok: true, merchantId: config.id });
});

app.get('/api/transactions', async (_req, reply) => {
  return reply.send(client.getTransactions());
});

app.get('/api/transactions/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const tx = client.getTransaction(id);
  if (!tx) {
    return reply.status(404).send({ error: 'Transaction not found' });
  }
  return reply.send(tx);
});

app.get('/api/health', async (_req, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

const staticDir = join(__dirname, '..', '..', 'payflow-dashboard', 'dist');
try {
  await app.register(fastifyStatic, {
    root: staticDir,
    prefix: '/',
    wildcard: false,
  });
  app.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html');
  });
  console.log(`Serving static files from ${staticDir}`);
} catch {
  console.log('No static dist found — API only mode');
}

const port = parseInt(process.env.PORT ?? '3001', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`PayFlow Server running on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
