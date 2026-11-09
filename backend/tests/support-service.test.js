import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupportService } from '../services/supportService.js';

const makeService = () => {
  const messages = [];
  const replies = [];
  const supportRepository = {
    create: async (input) => {
      const message = { id: messages.length + 1, ...input, update: async function update(data) { Object.assign(this, data); } };
      messages.push(message);
      return message;
    },
    createReply: async (input) => {
      const reply = { id: replies.length + 1, ...input };
      replies.push(reply);
      return reply;
    },
    listByEmail: async (email) => messages
      .filter((message) => message.email === email)
      .map((message) => ({
        ...message,
        replies: replies.filter((reply) => reply.supportMessageId === message.id)
      })),
    list: async ({ status, limit, offset }) => {
      const filtered = status ? messages.filter((message) => message.status === status) : messages;
      return { rows: filtered.slice(offset, offset + limit), count: filtered.length };
    },
    findById: async (id) => messages.find((message) => message.id === id) || null,
    updateStatus: async (id, status) => {
      const message = messages.find((entry) => entry.id === id);
      if (message) await message.update({ status });
      return message || null;
    }
  };
  return { messages, replies, service: createSupportService({ supportRepository }) };
};

test('customer support requests are validated and saved for the admin inbox', async () => {
  const { messages, service } = makeService();

  const saved = await service.submit({
    name: ' Customer ',
    email: ' CUSTOMER@EXAMPLE.COM ',
    message: '  Please contact me.  '
  });

  assert.equal(saved.name, 'Customer');
  assert.equal(saved.email, 'customer@example.com');
  assert.equal(saved.message, 'Please contact me.');
  assert.equal(saved.status, 'OPEN');
  assert.equal(messages.length, 1);
  await assert.rejects(() => service.submit({ name: 'Customer', email: 'invalid', message: 'Help' }), {
    code: 'VALIDATION_ERROR'
  });
});

test('customers can only view support conversations for their account email', async () => {
  const { service } = makeService();
  await service.submit({ name: 'Customer', email: 'customer@example.com', message: 'My request' });
  await service.submit({ name: 'Other', email: 'other@example.com', message: 'Private request' });

  const result = await service.listMine(' CUSTOMER@EXAMPLE.COM ');

  assert.equal(result.length, 1);
  assert.equal(result[0].message, 'My request');
  await assert.rejects(() => service.listMine(''), { code: 'UNAUTHENTICATED' });
});

test('customer replies are saved to their own support conversation only', async () => {
  const { service, replies } = makeService();
  const ownMessage = await service.submit({
    name: 'Customer',
    email: 'customer@example.com',
    message: 'Please help.'
  });
  const otherMessage = await service.submit({
    name: 'Other',
    email: 'other@example.com',
    message: 'Private request.'
  });

  const reply = await service.replyAsUser(ownMessage.id, 'customer@example.com', {
    message: 'Here is more information.'
  });

  assert.equal(reply.senderRole, 'user');
  assert.equal(reply.deliveryMode, 'demo');
  assert.equal(replies.length, 1);
  await assert.rejects(
    () => service.replyAsUser(otherMessage.id, 'customer@example.com', { message: 'Unauthorized' }),
    { code: 'NOT_FOUND' }
  );
  await assert.rejects(
    () => service.replyAsUser(ownMessage.id, 'customer@example.com', { message: '  ' }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('admin can filter and update support request status', async () => {
  const { service } = makeService();
  await service.submit({ name: 'Customer', email: 'customer@example.com', message: 'Need help.' });

  const result = await service.list({ status: 'OPEN', page: '1', limit: '20' });
  assert.equal(result.count, 1);
  assert.equal(result.rows[0].status, 'OPEN');

  const updated = await service.updateStatus(result.rows[0].id, 'RESOLVED');
  assert.equal(updated.status, 'RESOLVED');
  assert.equal((await service.list({ status: 'OPEN' })).count, 0);
});

test('admin support reply sends to the customer address from the stored request', async () => {
  let email;
  const messages = [];
  const replies = [];
  const supportRepository = {
    create: async (input) => {
      const message = { id: 1, ...input, update: async function update(data) { Object.assign(this, data); } };
      messages.push(message);
      return message;
    },
    list: async () => ({ rows: messages, count: messages.length }),
    findById: async (id) => messages.find((message) => message.id === id) || null,
    createReply: async (input) => {
      const savedReply = { id: replies.length + 1, ...input };
      replies.push(savedReply);
      return savedReply;
    },
    listByEmail: async (email) => messages
      .filter((message) => message.email === email)
      .map((message) => ({
        ...message,
        replies: replies.filter((reply) => reply.supportMessageId === message.id)
      }))
  };
  const service = createSupportService({
    supportRepository,
    emailService: {
      sendSupportReply: async (input) => {
        email = input;
        return { messageId: 'mail-1', simulated: true };
      }
    }
  });
  await service.submit({ name: 'Customer', email: 'customer@example.com', message: 'Please help.' });

  const result = await service.reply(1, { message: 'We will help.' });

  assert.equal(email.to, 'customer@example.com');
  assert.equal(email.originalMessage, 'Please help.');
  assert.equal(email.replyMessage, 'We will help.');
  assert.equal(result.messageId, 'mail-1');
  assert.equal(result.simulated, true);
  assert.deepEqual(await service.listMine('customer@example.com').then((items) => items[0].replies), [{
    id: 1,
    supportMessageId: 1,
    message: 'We will help.',
    senderRole: 'admin',
    deliveryMode: 'demo'
  }]);
  await assert.rejects(() => service.reply(1, { message: '  ' }), { code: 'VALIDATION_ERROR' });
});

test('admin can read SMTP readiness without exposing credentials', () => {
  const status = { configured: false, missingVariables: ['SMTP_HOST'] };
  const service = createSupportService({
    supportRepository: {},
    emailService: { getConfigurationStatus: () => status }
  });

  assert.equal(service.getEmailConfigurationStatus(), status);
});
