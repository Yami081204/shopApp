const withoutPassword = (user) => {
  if (!user) return null;
  const data = user.toJSON();
  delete data.password;
  return data;
};

const createAuthRepository = ({ db, User, RevokedToken }) => ({
  transaction: (callback) => db.transaction(callback),

  findById: async (id, transaction) => withoutPassword(await User.findByPk(id, { transaction })),

  findByEmail: async (email, transaction) => withoutPassword(await User.findOne({
    where: { email },
    transaction
  })),

  listUsers: async () => (await User.findAll({
    attributes: { exclude: ['password'] },
    order: [['createdAt', 'DESC']]
  })).map(withoutPassword),

  create: async (data) => withoutPassword(await User.create(data)),

  deleteById: async (id) => {
    const user = await User.findByPk(id);
    if (!user) return false;
    await user.destroy();
    return true;
  },

  authenticate: async (email, password) => {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password))) return null;
    return withoutPassword(user);
  },

  updateProfile: async (id, updates, transaction) => {
    const user = await User.findByPk(id, { transaction });
    if (!user) return null;
    Object.assign(user, updates);
    await user.save({ transaction });
    return withoutPassword(user);
  },

  updatePassword: async (id, password, transaction) => {
    const user = await User.findByPk(id, { transaction });
    if (!user) return false;
    user.password = password;
    await user.save({ transaction });
    return true;
  },

  verifyPasswordForUser: async (id, password) => {
    const user = await User.findByPk(id);
    return Boolean(user && await user.matchPassword(password));
  },

  revokeToken: (jti, expiresAt) => RevokedToken.findOrCreate({
    where: { jti },
    defaults: { expiresAt }
  })
});

export { createAuthRepository };
