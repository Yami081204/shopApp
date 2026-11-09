import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Save, Edit3, ShoppingBag, Heart, Settings, Package, Clock, Truck, CheckCircle, XCircle, MessageSquare, Eye, EyeOff, Camera } from 'lucide-react';

import { useAllContexts } from '@/hooks/useAllContexts';
import { userService, orderService } from '@/services';
import { supportService, SupportMessage } from '@/services/supportService';
import { getAssetUrl } from '@/lib/config';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  getAddressError,
  getEmailError,
  getLoginPasswordError,
  getNameError,
  normalizeName,
  getPasswordError,
  getPhoneError,
  sanitizeNameInput
} from '@/lib/accountValidation';
import { Order, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const Profile = () => {
  const { user, isAuthenticated, isAuthLoading, wishlist, removeFromWishlist, addToCart, updateCurrentUser } = useAllContexts();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const isNameComposing = useRef(false);
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [supportReplyDrafts, setSupportReplyDrafts] = useState<Record<number, string>>({});
  const [sendingSupportReplyId, setSendingSupportReplyId] = useState<number | null>(null);
  
  // Wishlist state  
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  // Ensure wishlist is always an array
  const safeWishlist = wishlist || [];
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const profileData = await userService.getUserProfile();
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        email: profileData.email || '',
        address: profileData.address || '',
        phone: profileData.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin profile',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load user profile
  useEffect(() => {
    if (isAuthenticated && user) {
      void loadProfile();
    }
  }, [isAuthenticated, user, loadProfile]);

  // Load user orders
  const loadOrders = async () => {
    try {
      setIsOrdersLoading(true);
      const ordersData = await orderService.getMyOrders();
      setOrders(ordersData);
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách đơn hàng',
        variant: 'destructive'
      });
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const loadSupportMessages = async () => {
    try {
      setIsSupportLoading(true);
      setSupportMessages(await supportService.listMine());
    } catch (error) {
      toast({
        title: 'Không thể tải hộp thư hỗ trợ',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsSupportLoading(false);
    }
  };

  const sendSupportReply = async (event: React.FormEvent<HTMLFormElement>, supportMessageId: number) => {
    event.preventDefault();
    const message = supportReplyDrafts[supportMessageId]?.trim();
    if (!message) return;

    try {
      setSendingSupportReplyId(supportMessageId);
      await supportService.replyAsUser(supportMessageId, message);
      setSupportReplyDrafts((current) => ({ ...current, [supportMessageId]: '' }));
      await loadSupportMessages();
      toast({ title: 'Đã gửi phản hồi cho bộ phận hỗ trợ' });
    } catch (error) {
      toast({
        title: 'Không gửi được phản hồi',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setSendingSupportReplyId(null);
    }
  };

  const handleBuyAgain = async (order: Order) => {
    const availableItems = (order.orderItems || []).filter((item) => item.product);
    if (availableItems.length === 0) {
      toast({
        title: 'Unable to reorder',
        description: 'None of the products from this order are currently available.',
        variant: 'destructive'
      });
      return;
    }
    try {
      for (const item of availableItems) {
        await addToCart(item.product, item.quantity, item.variantId ?? undefined);
      }
      navigate('/checkout', {
        state: {
          reorder: {
            shippingAddress: order.shippingAddress,
            paymentMethod: order.paymentMethod
          }
        }
      });
    } catch (error) {
      toast({
        title: 'Unable to reorder',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  // Handle add to cart from wishlist
  const handleAddToCartFromWishlist = async (product: Product) => {
    await addToCart(product, 1).catch(() => undefined);
  };

  // Handle remove from wishlist
  const handleRemoveFromWishlist = async (productId: number) => {
    try {
      setIsWishlistLoading(true);
      await removeFromWishlist(productId).catch(() => undefined);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' && !isNameComposing.current ? sanitizeNameInput(value) : value
    }));
  };

  const handleNameCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isNameComposing.current = false;
    const name = sanitizeNameInput(e.currentTarget.value);
    setFormData((current) => ({ ...current, name }));
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Ảnh không hợp lệ',
        description: 'Chọn ảnh JPEG, PNG hoặc WebP.',
        variant: 'destructive'
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Ảnh quá lớn',
        description: 'Dung lượng ảnh tối đa là 2 MB.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsAvatarUploading(true);
      const updatedUser = await userService.uploadUserAvatar(file);
      setProfile((current) => current
        ? { ...current, avatarUrl: updatedUser.avatarUrl || null }
        : current);
      updateCurrentUser({ avatarUrl: updatedUser.avatarUrl || null });
      toast({ title: 'Đã cập nhật ảnh đại diện' });
    } catch (error) {
      toast({
        title: 'Không thể cập nhật ảnh đại diện',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);

      const validationError = getNameError(formData.name)
        || getEmailError(formData.email)
        || getPhoneError(formData.phone)
        || getAddressError(formData.address);
      if (validationError) {
        toast({ title: 'Thông tin chưa hợp lệ', description: validationError, variant: 'destructive' });
        return;
      }

      const updateData: Record<string, string> = {
        name: normalizeName(formData.name),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        phone: formData.phone.trim()
      };

      const hasPasswordInput = Boolean(
        formData.currentPassword || formData.newPassword || formData.confirmPassword
      );
      if (hasPasswordInput) {
        const currentPasswordError = getLoginPasswordError(formData.currentPassword);
        if (currentPasswordError) {
          toast({ title: 'Thông tin chưa hợp lệ', description: 'Vui lòng nhập mật khẩu hiện tại hợp lệ.', variant: 'destructive' });
          return;
        }

        const newPasswordError = getPasswordError(formData.newPassword);
        if (newPasswordError) {
          toast({ title: 'Thông tin chưa hợp lệ', description: newPasswordError, variant: 'destructive' });
          return;
        }

        if (!formData.confirmPassword) {
          toast({ title: 'Thông tin chưa hợp lệ', description: 'Vui lòng xác nhận mật khẩu mới.', variant: 'destructive' });
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          toast({ title: 'Thông tin chưa hợp lệ', description: 'Mật khẩu mới không khớp.', variant: 'destructive' });
          return;
        }

        updateData.currentPassword = formData.currentPassword;
        updateData.password = formData.newPassword;
      }

      const updatedProfile = await userService.updateUserProfile(updateData);
      setProfile(updatedProfile);
      updateCurrentUser({
        name: updatedProfile.name,
        email: updatedProfile.email,
        address: updatedProfile.address,
        phone: updatedProfile.phone
      });
      setIsEditing(false);
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      toast({
        title: 'Thành công',
        description: 'Cập nhật thông tin thành công'
      });

    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorMessage(error, 'Không thể cập nhật thông tin'),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-beauty-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Personal Information</h1>
            <p className="text-muted-foreground">Quản lý thông tin tài khoản của bạn</p>
          </div>
          
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit3 size={16} />
              Chỉnh sửa
            </Button>
          )}
        </div>

        <Tabs defaultValue="profile" className="w-full" onValueChange={(value) => {
          if (value === 'orders' && (!orders || orders.length === 0)) {
            void loadOrders();
          }
          if (value === 'support') {
            void loadSupportMessages();
          }
        }}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Personal Information</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="support">Hộp thư hỗ trợ</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Info Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User size={20} />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Cập nhật thông tin cá nhân và thông tin liên hệ của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            onCompositionStart={() => { isNameComposing.current = true; }}
                            onCompositionEnd={handleNameCompositionEnd}
                            disabled={!isEditing}
                            placeholder="Nhập họ và tên"
                            maxLength={255}
                          />
                          {isEditing && <p className="text-xs text-muted-foreground">Chỉ dùng chữ cái, khoảng trắng, dấu nối (-) hoặc dấu nháy (').</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="Nhập email"
                            autoComplete="email"
                            maxLength={254}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="Nhập số điện thoại"
                            maxLength={32}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="Nhập địa chỉ"
                            maxLength={255}
                          />
                        </div>
                      </div>

                      {isEditing && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h4 className="font-medium">Thay đổi mật khẩu (tùy chọn)</h4>
                            
                            <div className="space-y-2">
                              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                              <div className="relative">
                                <Input
                                  id="currentPassword"
                                  name="currentPassword"
                                  type={visiblePasswords.current ? 'text' : 'password'}
                                  className="pr-10"
                                  value={formData.currentPassword}
                                  onChange={handleInputChange}
                                  placeholder="Nhập mật khẩu hiện tại"
                                  autoComplete="current-password"
                                />
                                <button
                                  type="button"
                                  aria-label={visiblePasswords.current ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                                  aria-pressed={visiblePasswords.current}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  onClick={() => setVisiblePasswords((current) => ({ ...current, current: !current.current }))}
                                >
                                  {visiblePasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                                <div className="relative">
                                  <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type={visiblePasswords.new ? 'text' : 'password'}
                                    className="pr-10"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    placeholder="Nhập mật khẩu mới"
                                    autoComplete="new-password"
                                    maxLength={72}
                                  />
                                  <button
                                    type="button"
                                    aria-label={visiblePasswords.new ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                                    aria-pressed={visiblePasswords.new}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setVisiblePasswords((current) => ({ ...current, new: !current.new }))}
                                  >
                                    {visiblePasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                                <div className="relative">
                                  <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={visiblePasswords.confirm ? 'text' : 'password'}
                                    className="pr-10"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Xác nhận mật khẩu mới"
                                    autoComplete="new-password"
                                    maxLength={72}
                                  />
                                  <button
                                    type="button"
                                    aria-label={visiblePasswords.confirm ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                                    aria-pressed={visiblePasswords.confirm}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setVisiblePasswords((current) => ({ ...current, confirm: !current.confirm }))}
                                  >
                                    {visiblePasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {isEditing && (
                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleSaveProfile} 
                            disabled={isSaving}
                            className="gap-2"
                          >
                            <Save size={16} />
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                          >
                            Hủy
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Account Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings size={20} />
                    Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center text-center space-y-2">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={getAssetUrl(profile?.avatarUrl)}
                            alt={`Ảnh đại diện của ${profile?.name || 'người dùng'}`}
                          />
                          <AvatarFallback className="text-lg font-semibold bg-beauty-100 text-beauty-600">
                            {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) => void handleAvatarChange(event)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isAvatarUploading}
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {isAvatarUploading ? 'Đang tải ảnh...' : 'Thay ảnh đại diện'}
                        </Button>
                        <p className="text-xs text-muted-foreground">JPEG, PNG hoặc WebP, tối đa 2 MB</p>
                        <div>
                          <h3 className="font-semibold">{profile?.name}</h3>
                          <p className="text-sm text-muted-foreground">{profile?.email}</p>
                        </div>
                        {profile?.isAdmin && (
                          <Badge variant="secondary" className="bg-beauty-100 text-beauty-600">
                            Admin
                          </Badge>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-muted-foreground" />
                          <span>{profile?.email}</span>
                        </div>
                        
                        {profile?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-muted-foreground" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                        
                        {profile?.address && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-muted-foreground" />
                            <span>{profile.address}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag size={20} />
                  Orders</CardTitle>
                <CardDescription>
                  Xem lịch sử đơn hàng và trạng thái giao hàng
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isOrdersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : !orders || orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Chưa có đơn hàng nào</h3>
                    <p className="text-muted-foreground mb-4">
                      Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm ngay!
                    </p>
                    <Button asChild>
                      <Link to="/products">Khám phá sản phẩm</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders?.map((order) => (
                      <div key={order.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">Order #{order.id}</h4>
                            <p className="text-sm text-muted-foreground">
                              Đặt ngày {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="capitalize">{order.status}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          {order.orderItems?.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm">
                              <div className="flex-1">
                                <span className="font-medium">{item.product?.name || 'Sản phẩm'}</span>
                                <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                              </div>
                              <span className="font-medium">{formatPrice(item.price)}</span>
                            </div>
                          ))}
                          {(order.orderItems?.length || 0) > 2 && (
                            <div className="text-sm text-muted-foreground">
                              + {(order.orderItems?.length || 0) - 2} sản phẩm khác
                            </div>
                          )}
                        </div>

                        <Separator className="my-3" />
                        
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            <div>Địa chỉ: {typeof order.shippingAddress === 'string'
                              ? order.shippingAddress
                              : order.shippingAddress?.address || 'Không có thông tin'}</div>
                            <div>Thanh toán: {order.paymentMethod || 'Không có thông tin'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-beauty-600">
                              {formatPrice(order.totalPrice)}
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/orders/${order.id}`}>
                                Xem chi tiết
                              </Link>
                            </Button>
                            <Button
                              className="mt-2"
                              variant="outline"
                              size="sm"
                              onClick={() => handleBuyAgain(order)}
                            >
                              Mua lại
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart size={20} />
                  Wishlist ({safeWishlist.length})
                </CardTitle>
                <CardDescription>
                  Các sản phẩm bạn đã lưu để mua sau
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isWishlistLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <Skeleton className="h-40 w-full mb-3" />
                        <Skeleton className="h-5 w-full mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : safeWishlist.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Chưa có sản phẩm yêu thích</h3>
                    <p className="text-muted-foreground mb-4">
                      Thêm sản phẩm vào danh sách yêu thích để dễ dàng tìm lại sau
                    </p>
                    <Button asChild>
                      <Link to="/products">Khám phá sản phẩm</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {safeWishlist.map((product) => (
                      <div key={product.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={48} className="text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm h-10 overflow-hidden" title={product.name}>
                            {product.name}
                          </h4>
                          
                          <div className="flex items-center gap-2">
                            {(product.discountPercent || 0) > 0 ? (
                              <>
                                <span className="text-lg font-bold text-beauty-600">
                                  {formatPrice(product.price * (1 - (product.discountPercent || 0) / 100))}
                                </span>
                                <span className="text-sm text-muted-foreground line-through">
                                  {formatPrice(product.price)}
                                </span>
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                                  -{product.discountPercent || 0}%
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-beauty-600">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleAddToCartFromWishlist(product)}
                            >
                              <ShoppingBag size={14} className="mr-1" />
                              Thêm vào giỏ
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRemoveFromWishlist(product.id)}
                              disabled={isWishlistLoading}
                            >
                              <Heart size={14} className="fill-current" />
                            </Button>
                          </div>

                          <Button variant="link" size="sm" className="w-full p-0 h-auto" asChild>
                            <Link to={`/products/${product.id}`} className="text-beauty-600">
                              Xem chi tiết
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={20} />
                  Hộp thư hỗ trợ
                </CardTitle>
                <CardDescription>
                  Theo dõi yêu cầu của bạn và xem các phản hồi từ quản trị viên.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSupportLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                ) : supportMessages.length === 0 ? (
                  <div className="py-10 text-center">
                    <MessageSquare size={40} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">Chưa có yêu cầu hỗ trợ nào.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Yêu cầu và trao đổi gửi bằng tài khoản này sẽ xuất hiện tại đây.
                    </p>
                    <Button className="mt-4" asChild>
                      <Link to="/contact">Liên hệ hỗ trợ</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportMessages.map((supportMessage) => (
                      <article key={supportMessage.id} className="space-y-3 rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">Yêu cầu hỗ trợ #{supportMessage.id}</h3>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(supportMessage.createdAt)}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                          {supportMessage.message}
                        </div>
                        <div className="space-y-3 border-l-2 border-beauty-300 pl-4">
                          {(supportMessage.replies || []).length === 0 && (
                            <p className="text-sm text-muted-foreground">Chưa có phản hồi nào trong hội thoại.</p>
                          )}
                          {supportMessage.replies?.map((reply) => (
                            <div key={reply.id}>
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold">
                                  {reply.senderRole === 'admin' ? 'YAMI hỗ trợ' : 'Bạn'}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(reply.createdAt)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm">{reply.message}</p>
                              {reply.deliveryMode === 'demo' && reply.senderRole === 'admin' && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Phản hồi demo được lưu trong hộp thư, không gửi ra email thật.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        <form onSubmit={(event) => void sendSupportReply(event, supportMessage.id)} className="space-y-2">
                          <label htmlFor={`support-reply-${supportMessage.id}`} className="block text-sm font-medium">
                            Trả lời hội thoại
                          </label>
                          <textarea
                            id={`support-reply-${supportMessage.id}`}
                            value={supportReplyDrafts[supportMessage.id] || ''}
                            onChange={(event) => setSupportReplyDrafts((current) => ({
                              ...current,
                              [supportMessage.id]: event.target.value
                            }))}
                            required
                            rows={3}
                            maxLength={10000}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Nhập nội dung cần trao đổi..."
                          />
                          <Button
                            type="submit"
                            disabled={sendingSupportReplyId === supportMessage.id || !supportReplyDrafts[supportMessage.id]?.trim()}
                          >
                            {sendingSupportReplyId === supportMessage.id ? 'Đang gửi...' : 'Gửi phản hồi'}
                          </Button>
                        </form>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile; 