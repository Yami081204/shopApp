import axiosClient from '@/lib/axios';
import { TOKEN_KEY, USER_KEY } from '@/lib/config';

// Interface cho User local
interface UserData {
  id?: number;
  name: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  status?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

interface ApiUserData {
  id?: number | string;
  userId?: number | string;
  name?: string;
  username?: string;
  fullName?: string;
  email?: string;
  password?: string;
  token?: string;
  user?: ApiUserData;
  isAdmin?: boolean;
  role?: string;
  status?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

interface ApiError {
  message?: string;
  response?: {
    status?: number;
    data?: { message?: string };
  };
}

const mapUserFromAPI = (userData: ApiUserData): UserData => {
  return {
    id: typeof userData.id === 'string' ? Number.parseInt(userData.id, 10) : userData.id,
    name: userData.name || '',
    email: userData.email || '',
    isAdmin: userData.isAdmin || false,
    status: userData.status || 'active',
    phone: userData.phone || '',
    address: userData.address || '',
    avatarUrl: userData.avatarUrl || null,
    createdAt: userData.createdAt || ''
  };
};

// Register a new user
export const register = async (name: string, email: string, password: string) => {
  const response = await axiosClient.post<ApiUserData>('/users/register', { name, email, password });
  const { token, ...userData } = response.data;
  if (!token || userData.id === undefined || userData.id === null) {
    throw new Error('Phản hồi đăng ký từ máy chủ không hợp lệ.');
  }

  const user = {
    id: String(userData.id),
    name: userData.name || '',
    email: userData.email || email,
    isAdmin: Boolean(userData.isAdmin),
    address: userData.address,
    phone: userData.phone,
    avatarUrl: userData.avatarUrl || null
  };
    
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
    
  return { user, token };
};

// Login user
export const login = async (email: string, password: string) => {
  try {
    const response = await axiosClient.post<ApiUserData>('/users/login', { email, password });
    const data = response.data;
    const sourceUser = data.user || data;
    const token = data.token;
    if (!token || sourceUser.id === undefined && sourceUser.userId === undefined) {
      throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ.');
    }
    const user = {
      id: String(sourceUser.id ?? sourceUser.userId),
      name: sourceUser.name || sourceUser.username || sourceUser.fullName || '',
      email: sourceUser.email || email,
      isAdmin: Boolean(sourceUser.isAdmin || sourceUser.role === 'admin'),
      status: sourceUser.status || 'active',
      avatarUrl: sourceUser.avatarUrl || null
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return { user, token };
  } catch (error: unknown) {
    const apiError = error as ApiError;
    
    // Nếu lỗi liên quan đến kết nối API
    if (apiError.message && (
      apiError.message.includes('Network Error') ||
      apiError.message.includes('timeout') ||
      apiError.message.includes('cannot') ||
      !apiError.response
    )) {
      throw new Error("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại sau.");
    }
    
    // Xử lý các lỗi từ API response
    if (apiError.response?.data?.message) {
      throw new Error(apiError.response.data.message);
    } else if (apiError.response?.status === 401) {
      throw new Error("Email hoặc mật khẩu không chính xác");
    } else if (apiError.response?.status === 404) {
      throw new Error("Tài khoản không tồn tại");
    } else if (apiError.message) {
      throw error;
    } else {
      throw new Error("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập của bạn.");
    }
  }
};

// Logout user
export const logout = async (): Promise<boolean> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const revokeRequest = token
    ? axiosClient.post('/users/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    : Promise.resolve();

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  try {
    await revokeRequest;
    return true;
  } catch {
    return false;
  }
};

// Get user profile
export const getUserProfile = async () => {
  const response = await axiosClient.get('/users/profile');
  return response.data;
};

// Update user profile
export const updateUserProfile = async (userData: Record<string, string>) => {
  const response = await axiosClient.put('/users/profile', userData);
  const updatedUser = response.data;
    
  // Update in localStorage if exists
  const storedUser = localStorage.getItem(USER_KEY);
  if (storedUser) {
    const parsedUser = JSON.parse(storedUser);
    localStorage.setItem(USER_KEY, JSON.stringify({ ...parsedUser, ...updatedUser }));
  }
    
  return updatedUser;
};

export const uploadUserAvatar = async (file: File) => {
  const response = await axiosClient.put<ApiUserData>('/users/profile/avatar', file, {
    headers: { 'Content-Type': file.type }
  });
  const updatedUser = response.data;
  const storedUser = localStorage.getItem(USER_KEY);
  if (storedUser) {
    localStorage.setItem(USER_KEY, JSON.stringify({ ...JSON.parse(storedUser), ...updatedUser }));
  }
  return updatedUser;
};

// Lấy tất cả người dùng (admin only)
export const getAllUsers = async (): Promise<UserData[]> => {
  const response = await axiosClient.get('/users');
  return response.data.map(mapUserFromAPI);
};

// Lấy thông tin người dùng theo ID
export const getUserById = async (id: number): Promise<UserData> => {
  const response = await axiosClient.get(`/users/${id}`);
  return mapUserFromAPI(response.data);
};

// Tạo người dùng mới (admin only)
export const createUser = async (userData: Omit<UserData, 'id'>): Promise<UserData> => {
  const response = await axiosClient.post('/users', userData);
  return mapUserFromAPI(response.data);
};

// Cập nhật thông tin người dùng (admin only)
export const updateUser = async (id: number, userData: Partial<UserData>): Promise<UserData> => {
  const response = await axiosClient.put(`/users/${id}`, userData);
  return mapUserFromAPI(response.data);
};

// Xóa người dùng (admin only)
export const deleteUser = async (id: number): Promise<boolean> => {
  await axiosClient.delete(`/users/${id}`);
  return true;
};

export const userService = {
  register,
  login,
  logout,
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};