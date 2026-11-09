import axiosClient from '@/lib/axios';

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface SupportMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  replies?: SupportReply[];
}

export interface SupportReply {
  id: number;
  message: string;
  senderRole: 'admin' | 'user';
  deliveryMode: 'demo' | 'smtp';
  createdAt: string;
}

interface SupportMessagesResponse {
  data: SupportMessage[];
  count: number;
  page: number;
  limit: number;
}

export interface SupportEmailConfigurationStatus {
  mode: 'demo' | 'smtp' | string;
  configured: boolean;
  missingVariables: string[];
}

const submit = async (input: Pick<SupportMessage, 'name' | 'email' | 'message'>) => {
  const response = await axiosClient.post<{ supportMessage: SupportMessage }>('/support', input);
  return response.data.supportMessage;
};

const list = async (params: { page?: number; limit?: number; status?: string } = {}) => {
  const response = await axiosClient.get<SupportMessagesResponse>('/support', { params });
  return response.data;
};

const listMine = async () => {
  const response = await axiosClient.get<{ data: SupportMessage[] }>('/support/mine');
  return response.data.data;
};

const updateStatus = async (id: number, status: SupportStatus) => {
  const response = await axiosClient.patch<{ supportMessage: SupportMessage }>(`/support/${id}/status`, { status });
  return response.data.supportMessage;
};

const reply = async (id: number, message: string) => {
  const response = await axiosClient.post<{
    message: string;
    messageId: string;
    simulated: boolean;
  }>(`/support/${id}/reply`, { message });
  return response.data;
};

const replyAsUser = async (id: number, message: string) => {
  const response = await axiosClient.post<{ reply: SupportReply }>(`/support/mine/${id}/replies`, { message });
  return response.data.reply;
};

const emailStatus = async () => {
  const response = await axiosClient.get<SupportEmailConfigurationStatus>('/support/email-status');
  return response.data;
};

export const supportService = { submit, list, listMine, updateStatus, reply, replyAsUser, emailStatus };
