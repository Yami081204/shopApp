import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';
import { requireFields } from '../utils/requireFields.js';

const EMAIL_PATTERN = /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
const PHONE_PATTERN = /^\+?[0-9](?:[0-9().\s-]*[0-9])?$/;
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '-]\p{L}[\p{L}\p{M}]*)*$/u;
const hasControlCharacters = (value) => Array.from(value).some((character) => {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127;
});

const validateName = (name) => {
  if (typeof name !== 'string') {
    throw new AppError('Name must be a string', 400, 'VALIDATION_ERROR');
  }
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  if (!normalizedName || normalizedName.length > 255 || !NAME_PATTERN.test(normalizedName)) {
    throw new AppError('Name may contain letters, spaces, hyphens, and apostrophes only', 400, 'VALIDATION_ERROR');
  }
  return normalizedName;
};

const validateEmail = (email) => {
  if (typeof email !== 'string') {
    throw new AppError('A valid email is required', 400, 'VALIDATION_ERROR');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split('@')[0];
  if (normalizedEmail.length > 254 || localPart.length > 64 || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('A valid email is required', 400, 'VALIDATION_ERROR');
  }
  return normalizedEmail;
};

const validatePassword = (password, fieldName = 'Password') => {
  if (typeof password !== 'string' || password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new AppError(`${fieldName} must contain at least 8 characters, an uppercase letter, and a number (maximum 72 bytes)`, 400, 'VALIDATION_ERROR');
  }
};

const validateOptionalText = (value, fieldName) => {
  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} must be a string`, 400, 'VALIDATION_ERROR');
  }
  const normalizedValue = value.trim();
  if (normalizedValue.length > 255 || hasControlCharacters(normalizedValue)) {
    throw new AppError(`${fieldName} must contain at most 255 valid characters`, 400, 'VALIDATION_ERROR');
  }
  return normalizedValue;
};

const validatePhone = (value) => {
  const phone = validateOptionalText(value, 'Phone');
  if (!phone) return phone;
  const digitCount = phone.replace(/\D/g, '').length;
  if (!PHONE_PATTERN.test(phone) || phone.length > 32 || digitCount < 7 || digitCount > 15) {
    throw new AppError('Phone must contain 7 to 15 digits and use a valid phone format', 400, 'VALIDATION_ERROR');
  }
  return phone;
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  address: user.address,
  phone: user.phone,
  avatarUrl: user.avatarUrl || null,
  isAdmin: Boolean(user.isAdmin)
});

const createAuthService = ({
  authRepository,
  tokenService,
  avatarStorage
}) => {
  const getProfile = async (userId) => {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
  };

  const listUsers = () => authRepository.listUsers();

  const deleteUser = async (userId, actorId) => {
    const id = parsePositiveInteger(userId, 'id');
    const user = await authRepository.findById(id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    if (user.id === actorId) {
      throw new AppError('Administrators cannot delete their own account', 409, 'CONFLICT');
    }
    if (!(await authRepository.deleteById(id))) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
  };

  const register = async ({ name, email, password, address, phone } = {}) => {
    requireFields({ name, email, password }, ['name', 'email', 'password']);
    const normalizedName = validateName(name);
    const normalizedEmail = validateEmail(email);
    validatePassword(password);
    const normalizedAddress = address === undefined ? undefined : validateOptionalText(address, 'Address');
    const normalizedPhone = phone === undefined ? undefined : validatePhone(phone);
    if (await authRepository.findByEmail(normalizedEmail)) {
      throw new AppError('User already exists', 409, 'CONFLICT');
    }
    const user = await authRepository.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      address: normalizedAddress,
      phone: normalizedPhone,
      isAdmin: false
    });
    return { user: publicUser(user), token: tokenService.issue(user.id) };
  };

  const login = async ({ email, password } = {}) => {
    requireFields({ email, password }, ['email', 'password']);
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError('Email and password must be strings', 400, 'VALIDATION_ERROR');
    }
    const normalizedEmail = validateEmail(email);
    const user = await authRepository.authenticate(normalizedEmail, password);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'UNAUTHENTICATED');
    }
    return { user: publicUser(user), token: tokenService.issue(user.id) };
  };

  const updateProfile = async (userId, updates = {}, transaction) => {
    const user = await authRepository.findById(userId, transaction);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw new AppError('Profile data must be an object', 400, 'VALIDATION_ERROR');
    }
    const allowedFields = new Set(['name', 'email', 'address', 'phone']);
    const unsupportedFields = Object.keys(updates).filter((field) => !allowedFields.has(field));
    if (unsupportedFields.length) {
      throw new AppError(`Unsupported profile fields: ${unsupportedFields.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    if (!Object.keys(updates).length) {
      throw new AppError('At least one profile field is required', 400, 'VALIDATION_ERROR');
    }

    const changes = {};
    if (Object.hasOwn(updates, 'email')) {
      const email = validateEmail(updates.email);
      const existing = await authRepository.findByEmail(email, transaction);
      if (existing && existing.id !== user.id) {
        throw new AppError('Email is already in use', 409, 'CONFLICT');
      }
      changes.email = email;
    }
    if (Object.hasOwn(updates, 'name')) changes.name = validateName(updates.name);
    if (Object.hasOwn(updates, 'address')) changes.address = validateOptionalText(updates.address, 'Address');
    if (Object.hasOwn(updates, 'phone')) changes.phone = validatePhone(updates.phone);
    const updated = await authRepository.updateProfile(userId, changes, transaction);
    if (!updated) throw new AppError('User not found', 404, 'NOT_FOUND');
    return publicUser(updated);
  };

  const changePassword = async (userId, { currentPassword, newPassword } = {}, transaction) => {
    requireFields({ currentPassword, newPassword }, ['currentPassword', 'newPassword']);
    if (typeof currentPassword !== 'string') {
      throw new AppError('Current password must be a string', 400, 'VALIDATION_ERROR');
    }
    validatePassword(newPassword, 'New password');
    const user = await authRepository.findById(userId, transaction);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    if (!(await authRepository.verifyPasswordForUser(userId, currentPassword))) {
      throw new AppError('Current password is incorrect', 400, 'VALIDATION_ERROR');
    }
    if (!(await authRepository.updatePassword(userId, newPassword, transaction))) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
  };

  const updateProfileAndPassword = async (userId, updates, passwordChange) => (
    authRepository.transaction(async (transaction) => {
      const user = await updateProfile(userId, updates, transaction);
      await changePassword(userId, passwordChange, transaction);
      return user;
    })
  );

  const updateAvatar = async (userId, image, contentType) => {
    if (!avatarStorage) {
      throw new AppError('Avatar upload is not configured', 503, 'AVATAR_CONFIGURATION_ERROR');
    }

    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const previousAvatarUrl = user.avatarUrl;
    const avatarUrl = await avatarStorage.save(image, contentType);
    let updated;
    try {
      updated = await authRepository.updateProfile(userId, { avatarUrl });
    } catch (error) {
      try {
        await avatarStorage.remove(avatarUrl);
      } catch (cleanupError) {
        console.error('Failed to remove an unreferenced avatar file:', cleanupError);
      }
      throw error;
    }
    if (!updated) {
      await avatarStorage.remove(avatarUrl);
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (previousAvatarUrl) {
      try {
        await avatarStorage.remove(previousAvatarUrl);
      } catch (error) {
        console.error('Failed to remove the previous avatar file:', error);
      }
    }
    return publicUser(updated);
  };

  const logout = async (tokenPayload) => {
    if (!tokenPayload?.jti || !tokenPayload.exp) return;
    await authRepository.revokeToken(tokenPayload.jti, new Date(tokenPayload.exp * 1000));
  };

  return {
    register,
    login,
    getProfile,
    listUsers,
    deleteUser,
    updateProfile,
    updateProfileAndPassword,
    updateAvatar,
    changePassword,
    logout,
    issueToken: (userId) => tokenService.issue(userId)
  };
};

export { createAuthService, publicUser };
