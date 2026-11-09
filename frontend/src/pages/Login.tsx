import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { getEmailError, getLoginPasswordError } from '@/lib/accountValidation';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isAuthLoading } = useAllContexts();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const emailError = getEmailError(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const passwordError = getLoginPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      await login(email.trim().toLowerCase(), password);
      if (rememberMe) localStorage.setItem('rememberedEmail', email.trim());
      else localStorage.removeItem('rememberedEmail');
      toast({ title: 'Đăng nhập thành công', description: 'Chào mừng bạn quay trở lại.' });
      navigate('/');
    } catch (requestError: unknown) {
      const errorWithResponse = requestError as { response?: { data?: { message?: string } }; message?: string };
      setError(errorWithResponse.response?.data?.message || errorWithResponse.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    }
  };

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10 md:py-16">
      <section className="w-full max-w-md rounded-xl border bg-white p-6 sm:p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">YAMI</p>
        <h1 className="mt-2 text-center text-2xl font-semibold">Đăng nhập</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Đăng nhập để quản lý đơn hàng và giỏ hàng của bạn.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
          {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
            <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">Ghi nhớ email trên thiết bị này</Label>
          </div>
          <Button type="submit" className="w-full" disabled={isAuthLoading}>
            <LogIn className="mr-2 h-4 w-4" />
            {isAuthLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Chưa có tài khoản? <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">Đăng ký</Link>
        </p>
      </section>
    </div>
  );
};

export default Login;
