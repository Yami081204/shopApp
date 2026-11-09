import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  changePassword,
  getUsers,
  deleteUser
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getUsers);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.put('/profile/avatar', protect, express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: '2mb'
}), uploadUserAvatar);
router.get('/me', protect, getUserProfile);
router.put('/change-password', protect, changePassword);

router.route('/:id')
  .delete(protect, admin, deleteUser);

export default router;