import { FormEvent, useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import { supportService } from '@/services/supportService';

const SUPPORT_EMAIL = 'ZaidepYamiFashion@gmail.com';
const SUPPORT_PHONE = '+84352053500';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await supportService.submit(form);
      setSubmitted(true);
      setForm({ name: '', email: '', message: '' });
      toast({ title: 'Đã gửi yêu cầu hỗ trợ', description: 'Yêu cầu đã được lưu và chuyển vào hộp thư hỗ trợ của quản trị viên.' });
    } catch (error) {
      toast({
        title: 'Không thể gửi yêu cầu',
        description: getApiErrorMessage(error, 'Vui lòng thử lại sau.'),
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container min-h-[70vh] py-8 md:py-12">
      <header className="mb-8 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">YAMI support</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Liên hệ hỗ trợ</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gửi yêu cầu tại đây. Nội dung sẽ được lưu vào hệ thống để quản trị viên tiếp nhận và phản hồi qua email của bạn.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-white p-5 sm:p-6">
          {submitted && (
            <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              Yêu cầu đã được gửi và lưu thành công. Quản trị viên sẽ liên hệ qua email bạn cung cấp.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="contact-name">Họ và tên</Label>
            <Input
              id="contact-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email phản hồi</Label>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-message">Nội dung</Label>
            <Textarea
              id="contact-message"
              rows={6}
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              required
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu hỗ trợ'}
          </Button>
        </form>

        <aside className="h-fit space-y-5 rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium">Email</p>
              <a className="break-all text-sm text-muted-foreground hover:text-foreground" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Điện thoại</p>
              <a className="text-sm text-muted-foreground hover:text-foreground" href={`tel:${SUPPORT_PHONE}`}>+84 35 205 3500</a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Địa chỉ</p>
              <p className="text-sm leading-6 text-muted-foreground">109, Go Vap, Ho Chi Minh City, Vietnam</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Contact;
