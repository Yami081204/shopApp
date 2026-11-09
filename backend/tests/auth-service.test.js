import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../services/authService.js';

const makeAuthService = () => {
  const users = [];
  const removedAvatars = [];
  let nextId = 1;
  const authRepository = {
    findById: async (id) => users.find((user) => user.id === Number(id)) || null,
    findByEmail: async (email) => users.find((user) => user.email === email) || null,
    listUsers: async () => users,
    create: async (data) => {
      const user = { id: nextId++, ...data };
      users.push(user);
      return user;
    },
    deleteById: async (id) => {
      const index = users.findIndex((user) => user.id === Number(id));
      if (index < 0) return false;
      users.splice(index, 1);
      return true;
    },
    authenticate: async (email, password) => users.find((user) =>
      user.email === email && user.password === password
    ) || null,
    updateProfile: async (id, updates) => {
      const user = users.find((entry) => entry.id === Number(id));
      if (!user) return null;
      Object.assign(user, updates);
      return user;
    },
    verifyPasswordForUser: async (id, password) => users.some((user) =>
      user.id === Number(id) && user.password === password
    ),
    updatePassword: async (id, password) => {
      const user = users.find((entry) => entry.id === Number(id));
      if (!user) return false;
      user.password = password;
      return true;
    },
    transaction: async (callback) => callback({})
  };
  const service = createAuthService({
    authRepository,
    tokenService: { issue: (userId) => `token-${userId}` },
    avatarStorage: {
      save: async () => '/uploads/avatars/new-avatar.png',
      remove: async (avatarUrl) => { removedAvatars.push(avatarUrl); }
    }
  });
  return { service, users, removedAvatars };
};

test('auth service uses its repository and returns public user data with a signed token', async () => {
  const { service, users } = makeAuthService();

  const registered = await service.register({
    name: ' Customer ',
    email: ' CUSTOMER@example.com ',
    password: 'Password123'
  });

  assert.equal(registered.user.name, 'Customer');
  assert.equal(registered.user.email, 'customer@example.com');
  assert.equal(Object.hasOwn(registered.user, 'password'), false);
  assert.equal(users.length, 1);
  assert.equal(registered.token, `token-${registered.user.id}`);

  const loggedIn = await service.login({ email: 'CUSTOMER@example.com', password: 'Password123' });
  assert.equal(loggedIn.user.id, registered.user.id);
  await assert.rejects(
    () => service.login({ email: 'customer@example.com', password: 'incorrect' }),
    { code: 'UNAUTHENTICATED' }
  );
  await assert.rejects(
    () => service.login({ email: 'invalid-email', password: 'Password123' }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('auth service rejects invalid registration fields and password policy violations', async () => {
  const { service, users } = makeAuthService();
  const invalidRegistrations = [
    { name: '   ', email: 'customer@example.com', password: 'Password123' },
    { name: 'Customer123', email: 'customer@example.com', password: 'Password123' },
    { name: 'Yami@Store', email: 'customer@example.com', password: 'Password123' },
    { name: ' -Customer', email: 'customer@example.com', password: 'Password123' },
    { name: 'Customer', email: '.customer@example.com', password: 'Password123' },
    { name: 'Customer', email: `${'a'.repeat(65)}@example.com`, password: 'Password123' },
    { name: 'Customer', email: 'customer@example.com', password: 'password123' },
    { name: 'Customer', email: 'customer@example.com', password: 'Pass1' },
    { name: 'Customer', email: 'customer@example.com', password: 'Password123', phone: '12345' },
    { name: 'Customer', email: 'customer@example.com', password: 'Password123', phone: '--1234567' },
    { name: 'Customer', email: 'customer@example.com', password: 'Password123', phone: `${'1'.repeat(15)}${'-'.repeat(18)}1` },
    { name: 'Customer', email: 'customer@example.com', password: 'Password123', address: 'x'.repeat(256) }
  ];

  for (const input of invalidRegistrations) {
    await assert.rejects(() => service.register(input), { code: 'VALIDATION_ERROR' });
  }
  assert.equal(users.length, 0);
});

test('auth service keeps existing accounts with older password policies able to log in', async () => {
  const { service, users } = makeAuthService();
  users.push({
    id: 1,
    name: 'Existing Customer',
    email: 'existing@example.com',
    password: 'password123',
    isAdmin: false
  });

  const result = await service.login({ email: 'existing@example.com', password: 'password123' });
  assert.equal(result.user.email, 'existing@example.com');
});

test('auth service rejects self-deletion and restricts profile/password updates', async () => {
  const { service } = makeAuthService();
  const { user } = await service.register({
    name: 'Customer',
    email: 'customer@example.com',
    password: 'Password123'
  });

  await assert.rejects(() => service.deleteUser(user.id, user.id), { code: 'CONFLICT' });
  await assert.rejects(
    () => service.updateProfile(user.id, { isAdmin: true }),
    { code: 'VALIDATION_ERROR' }
  );
  await assert.rejects(
    () => service.changePassword(user.id, {
      currentPassword: 'wrong-password',
      newPassword: 'NewPassword123'
    }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('auth service validates and normalizes profile updates', async () => {
  const { service } = makeAuthService();
  const { user } = await service.register({
    name: '  Nguyễn   Thị Ánh  ',
    email: 'customer@example.com',
    password: 'Password123'
  });
  assert.equal(user.name, 'Nguyễn Thị Ánh');

  const updated = await service.updateProfile(user.id, {
    name: "  Jean-Luc O'Connor ",
    email: ' UPDATED@example.com ',
    phone: '+84 (90) 123-4567',
    address: '  Ho Chi Minh City  '
  });
  assert.equal(updated.name, "Jean-Luc O'Connor");
  assert.equal(updated.email, 'updated@example.com');
  assert.equal(updated.phone, '+84 (90) 123-4567');
  assert.equal(updated.address, 'Ho Chi Minh City');

  for (const invalidUpdate of [
    { name: ' \t ' },
    { name: 'Customer007' },
    { name: 'Yami#Shop' },
    { name: 'Name--Name' },
    { email: 'invalid' },
    { email: null },
    { phone: 'abc1234567' },
    { phone: '--1234567' },
    { phone: '1234567890123456' },
    { address: 'x'.repeat(256) },
    { isAdmin: true },
    { avatarUrl: '/other-user-avatar.png' },
    {}
  ]) {
    await assert.rejects(() => service.updateProfile(user.id, invalidUpdate), { code: 'VALIDATION_ERROR' });
  }
});

test('auth service changes a password only after validating the current password and new policy', async () => {
  const { service } = makeAuthService();
  const { user } = await service.register({
    name: 'Customer',
    email: 'customer@example.com',
    password: 'Password123'
  });

  const updated = await service.updateProfileAndPassword(
    user.id,
    { name: 'Updated Customer' },
    { currentPassword: 'Password123', newPassword: 'NewPassword123' }
  );
  assert.equal(updated.name, 'Updated Customer');
  assert.equal((await service.login({ email: user.email, password: 'NewPassword123' })).user.id, user.id);
  await assert.rejects(
    () => service.login({ email: user.email, password: 'Password123' }),
    { code: 'UNAUTHENTICATED' }
  );
});

test('avatar upload updates public profile data and removes the previous avatar', async () => {
  const { service, users, removedAvatars } = makeAuthService();
  const { user } = await service.register({
    name: 'Customer',
    email: 'customer@example.com',
    password: 'Password123'
  });
  users[0].avatarUrl = '/uploads/avatars/old-avatar.jpg';

  const updatedUser = await service.updateAvatar(user.id, Buffer.from('image'), 'image/png');

  assert.equal(updatedUser.avatarUrl, '/uploads/avatars/new-avatar.png');
  assert.equal(Object.hasOwn(updatedUser, 'password'), false);
  assert.deepEqual(removedAvatars, ['/uploads/avatars/old-avatar.jpg']);
});
