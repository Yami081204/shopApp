import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailService } from '../services/emailService.js';

const configuredEnv = {
  EMAIL_MODE: 'smtp',
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'store@example.test',
  SMTP_PASS: 'test-password',
  SMTP_FROM: 'YAMI <store@example.test>'
};

test('support reply email is sent with the customer and original message', async () => {
  let transportOptions;
  let sentMessage;
  const service = createEmailService({
    env: configuredEnv,
    createTransport: (options) => {
      transportOptions = options;
      return {
        sendMail: async (message) => {
          sentMessage = message;
          return { messageId: 'message-123' };
        }
      };
    }
  });

  const result = await service.sendSupportReply({
    to: 'customer@example.test',
    name: 'Customer',
    originalMessage: 'Original request',
    replyMessage: 'Reply content'
  });

  assert.equal(transportOptions.host, configuredEnv.SMTP_HOST);
  assert.equal(transportOptions.port, 587);
  assert.equal(sentMessage.to, 'customer@example.test');
  assert.match(sentMessage.text, /Reply content/);
  assert.match(sentMessage.text, /Original request/);
  assert.equal(result.messageId, 'message-123');
  assert.equal(result.simulated, false);
});

test('demo mode simulates email delivery without SMTP credentials', async () => {
  let transportOptions;
  let sentMessage;
  const service = createEmailService({
    env: { EMAIL_MODE: 'demo' },
    createTransport: (options) => {
      transportOptions = options;
      return {
        sendMail: async (message) => {
          sentMessage = message;
          return { messageId: 'demo-message-123' };
        }
      };
    }
  });

  assert.deepEqual(service.getConfigurationStatus(), {
    mode: 'demo',
    configured: true,
    missingVariables: []
  });

  const result = await service.sendSupportReply({
    to: 'customer@example.test',
    name: 'Customer',
    originalMessage: 'Original request',
    replyMessage: 'Reply content'
  });

  assert.deepEqual(transportOptions, { jsonTransport: true });
  assert.equal(sentMessage.to, 'customer@example.test');
  assert.equal(sentMessage.from, 'YAMI Demo <no-reply@example.test>');
  assert.match(sentMessage.text, /Reply content/);
  assert.equal(result.messageId, 'demo-message-123');
  assert.equal(result.simulated, true);
});

test('SMTP configuration defaults to implicit TLS on port 465', async () => {
  let transportOptions;
  const service = createEmailService({
    env: { ...configuredEnv, SMTP_PORT: '465', SMTP_SECURE: undefined },
    createTransport: (options) => {
      transportOptions = options;
      return { sendMail: async () => ({ messageId: 'message-465' }) };
    }
  });

  await service.sendSupportReply({
    to: 'customer@example.test',
    name: 'Customer',
    originalMessage: 'Original request',
    replyMessage: 'Reply content'
  });

  assert.equal(transportOptions.secure, true);
});

test('support reply fails explicitly when SMTP configuration is missing', async () => {
  const service = createEmailService({ env: { EMAIL_MODE: 'smtp' } });
  assert.deepEqual(service.getConfigurationStatus(), {
    mode: 'smtp',
    configured: false,
    missingVariables: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']
  });
  await assert.rejects(
    () => service.sendSupportReply({
      to: 'customer@example.test',
      name: 'Customer',
      originalMessage: 'Original request',
      replyMessage: 'Reply content'
    }),
    { code: 'EMAIL_CONFIGURATION_ERROR' }
  );
});

test('SMTP configuration status does not expose credential values', async () => {
  const service = createEmailService({ env: configuredEnv });
  assert.deepEqual(service.getConfigurationStatus(), {
    mode: 'smtp',
    configured: true,
    missingVariables: []
  });
  assert.equal(JSON.stringify(service.getConfigurationStatus()).includes(configuredEnv.SMTP_PASS), false);
});

test('SMTP delivery failures are logged and surfaced as an API error', async () => {
  const loggedErrors = [];
  const service = createEmailService({
    env: configuredEnv,
    createTransport: () => ({ sendMail: async () => { throw new Error('SMTP unavailable'); } }),
    logger: { error: (...args) => loggedErrors.push(args) }
  });

  await assert.rejects(
    () => service.sendSupportReply({
      to: 'customer@example.test',
      name: 'Customer',
      originalMessage: 'Original request',
      replyMessage: 'Reply content'
    }),
    { code: 'EMAIL_DELIVERY_ERROR' }
  );
  assert.equal(loggedErrors.length, 1);
});
