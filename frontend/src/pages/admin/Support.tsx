import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import { SupportMessage, SupportStatus, supportService } from '@/services/supportService';

const PAGE_SIZE = 20;

const statusLabels: Record<SupportStatus, string> = {
  OPEN: 'Mới nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý'
};

const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value));

const AdminSupport = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [missingEmailVariables, setMissingEmailVariables] = useState<string[]>([]);
  const [emailMode, setEmailMode] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const result = await supportService.list({
        page,
        limit: PAGE_SIZE,
        status: statusFilter
      });
      setMessages(result.data);
      setCount(result.count);
      setSelectedMessage((current) =>
        current ? result.data.find((message) => message.id === current.id) || null : null
      );
    } catch (error) {
      toast({
        title: 'Không thể tải yêu cầu hỗ trợ',
        description: getApiErrorMessage(error, 'Vui lòng thử lại.'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    void supportService.emailStatus().then((status) => {
      setEmailConfigured(status.configured);
      setMissingEmailVariables(status.missingVariables);
      setEmailMode(status.mode);
    }).catch((error) => {
      toast({
        title: 'Không thể kiểm tra cấu hình email',
        description: getApiErrorMessage(error, 'Vui lòng thử lại.'),
        variant: 'destructive'
      });
    });
  }, [toast]);

  const updateStatus = async (message: SupportMessage, status: SupportStatus) => {
    try {
      const updated = await supportService.updateStatus(message.id, status);
      const withReplies = { ...updated, replies: message.replies || [] };
      setMessages((current) => current.map((item) => item.id === updated.id ? withReplies : item));
      setSelectedMessage(withReplies);
      toast({ title: 'Đã cập nhật trạng thái yêu cầu' });
    } catch (error) {
      toast({
        title: 'Không thể cập nhật yêu cầu',
        description: getApiErrorMessage(error, 'Vui lòng thử lại.'),
        variant: 'destructive'
      });
    }
  };

  const sendReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMessage || !replyDraft.trim()) return;

    setSendingReply(true);
    try {
      const result = await supportService.reply(selectedMessage.id, replyDraft.trim());
      await fetchMessages();
      toast({
        title: result.simulated ? 'Đã giả lập email phản hồi' : 'Đã gửi email phản hồi',
        description: result.simulated
          ? `Demo: email đến ${selectedMessage.email} chỉ được tạo giả lập, không gửi ra ngoài.`
          : `Email đã được gửi đến ${selectedMessage.email}.`
      });
      setReplyDraft('');
    } catch (error) {
      toast({
        title: 'Không gửi được email phản hồi',
        description: getApiErrorMessage(error, 'Vui lòng kiểm tra cấu hình email và thử lại.'),
        variant: 'destructive'
      });
    } finally {
      setSendingReply(false);
    }
  };

  if (isAuthLoading) return <Skeleton className="h-60 w-full" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Liên hệ với khách hàng</p>
          <h1 className="text-2xl font-semibold">Yêu cầu hỗ trợ</h1>
        </div>
        <Button type="button" variant="outline" onClick={() => void fetchMessages()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </header>

      {emailMode === 'demo' && (
        <div role="status" className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-medium">Chế độ demo email đang bật.</p>
          <p className="mt-1">Phản hồi được giả lập để trình diễn; không có email thật nào được gửi.</p>
        </div>
      )}
      {emailConfigured === false && emailMode !== 'demo' && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Chưa cấu hình gửi email phản hồi.</p>
          <p className="mt-1">
            Bổ sung {missingEmailVariables.join(', ')} trong <code>backend/.env</code>, sau đó khởi động lại backend.
            Không chia sẻ thông tin SMTP hoặc mật khẩu ứng dụng.
          </p>
        </div>
      )}
      {emailConfigured === true && emailMode === 'smtp' && (
        <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          Đã điền đủ biến cấu hình SMTP. Khả năng kết nối máy chủ sẽ được xác nhận khi gửi email.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <p className="text-sm text-muted-foreground">{count} yêu cầu hỗ trợ</p>
        <select
          aria-label="Lọc yêu cầu hỗ trợ"
          value={statusFilter}
          onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>{label}</option>
          ))}
        </select>
      </div>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người gửi</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
              : messages.length
                ? messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="min-w-52">
                      <p className="font-medium">{message.name}</p>
                      <a className="text-sm text-muted-foreground hover:underline" href={`mailto:${message.email}`}>{message.email}</a>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <p className="line-clamp-2 whitespace-pre-wrap text-sm">{message.message}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(message.createdAt)}</TableCell>
                    <TableCell><Badge variant={message.status === 'OPEN' ? 'destructive' : 'secondary'}>{statusLabels[message.status]}</Badge></TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" onClick={() => {
                        setSelectedMessage(message);
                        setReplyDraft('');
                      }}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
                : <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Chưa có yêu cầu hỗ trợ nào.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end gap-3 border-t p-3">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
            <ChevronLeft className="h-4 w-4" /> Trước
          </Button>
          <span className="text-sm text-muted-foreground">Trang {page} / {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span>
          <Button type="button" size="sm" variant="outline" disabled={page * PAGE_SIZE >= count || loading} onClick={() => setPage((current) => current + 1)}>
            Sau <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {selectedMessage && (
        <section className="space-y-4 rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{selectedMessage.name}</h2>
              <a className="flex items-center gap-2 text-sm text-muted-foreground hover:underline" href={`mailto:${selectedMessage.email}`}>
                <Mail className="h-4 w-4" /> {selectedMessage.email}
              </a>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(selectedMessage.createdAt)}</p>
            </div>
            <select
              aria-label="Cập nhật trạng thái yêu cầu"
              value={selectedMessage.status}
              onChange={(event) => void updateStatus(selectedMessage, event.target.value as SupportStatus)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{selectedMessage.name} · Yêu cầu ban đầu</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{selectedMessage.message}</p>
            </div>
            {selectedMessage.replies?.map((reply) => (
              <div key={reply.id} className={`rounded-lg p-4 ${reply.senderRole === 'admin' ? 'bg-primary/5' : 'bg-muted/40'}`}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {reply.senderRole === 'admin' ? 'YAMI hỗ trợ' : selectedMessage.name}
                  </p>
                  <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">{reply.message}</p>
                {reply.deliveryMode === 'demo' && reply.senderRole === 'admin' && (
                  <p className="mt-1 text-xs text-muted-foreground">Phản hồi demo, không gửi email thật.</p>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={sendReply} className="space-y-3">
            <label htmlFor="support-reply" className="block text-sm font-medium">Trả lời hội thoại</label>
            <textarea
              id="support-reply"
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              required
              rows={5}
              maxLength={10000}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Soạn nội dung phản hồi cho khách hàng..."
            />
            <Button type="submit" disabled={sendingReply || !replyDraft.trim()}>
              <Mail className="mr-2 h-4 w-4" /> {sendingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
};

export default AdminSupport;
