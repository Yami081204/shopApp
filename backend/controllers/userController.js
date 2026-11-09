import { authService } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const registerUser = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body || {});
  res.status(201).json({ ...result.user, token: result.token });
});

const loginUser = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body || {});
  res.json({ ...result.user, token: result.token });
});

const logoutUser = asyncHandler(async (req, res) => {
  await authService.logout(req.tokenPayload);
  res.json({ message: 'Logged out successfully' });
});

const getUserProfile = asyncHandler(async (req, res) => {
  res.json(await authService.getProfile(req.user.id));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { currentPassword, password, newPassword, ...profile } = req.body || {};
  const passwordToSet = newPassword ?? password;
  if (passwordToSet !== undefined) {
    res.json(await authService.updateProfileAndPassword(
      req.user.id,
      profile,
      { currentPassword, newPassword: passwordToSet }
    ));
    return;
  }
  res.json(await authService.updateProfile(req.user.id, profile));
});

const uploadUserAvatar = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateAvatar(
    req.user.id,
    req.body,
    req.headers['content-type']?.split(';')[0]
  );
  res.json(updatedUser);
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body || {});
  res.json({ message: 'Password changed successfully' });
});

const getUsers = asyncHandler(async (req, res) => {
  res.json(await authService.listUsers());
});

const deleteUser = asyncHandler(async (req, res) => {
  await authService.deleteUser(req.params.id, req.user.id);
  res.json({ message: 'User removed' });
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  changePassword,
  getUsers,
  deleteUser
};
