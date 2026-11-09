import nodemailer from 'nodemailer';
import AppError from '../utils/AppError.js';

const createEmailService = ({
  env = process.env,
  createTransport = nodemailer.createTransport,
  logger = console
} = {}) => {
  const getConfiguration = () => {
    const configuredMode = env.EMAIL_MODE?.trim().toLowerCase();
    const mode = configuredMode || (env.NODE_ENV === 'production' ? 'smtp' : 'demo');
    const host = env.SMTP_HOST?.trim();
    const port = Number(env.SMTP_PORT || 587);
    const user = env.SMTP_USER?.trim();
    const password = env.SMTP_PASS;
    const from = env.SMTP_FROM?.trim();
    const missingVariables = [];
    if (!['demo', 'smtp'].includes(mode)) missingVariables.push('EMAIL_MODE');
    if (mode === 'smtp') {
      if (!host) missingVariables.push('SMTP_HOST');
      if (!Number.isInteger(port) || port < 1 || port > 65535) missingVariables.push('SMTP_PORT');
      if (!user) missingVariables.push('SMTP_USER');
      if (!password) missingVariables.push('SMTP_PASS');
      if (!from) missingVariables.push('SMTP_FROM');
    }
    const secureValue = env.SMTP_SECURE?.trim().toLowerCase();
    if (mode === 'smtp' && secureValue && !['true', 'false'].includes(secureValue)) {
      missingVariables.push('SMTP_SECURE');
    }

    return {
      mode,
      host,
      port,
      user,
      password,
      from: from || 'YAMI Demo <no-reply@example.test>',
      secure: !secureValue
        ? port === 465
        : secureValue === 'true',
      status: {
        mode,
        configured: missingVariables.length === 0,
        missingVariables: mode === 'demo' ? [] : missingVariables
      }
    };
  };

  return {
    getConfigurationStatus() {
      return getConfiguration().status;
    },

    async sendSupportReply({ to, name, originalMessage, replyMessage }) {
      const { mode, host, port, user, password, from, secure, status } = getConfiguration();
      if (!status.configured) {
        throw new AppError(
          `Email delivery is not configured. Missing or invalid: ${status.missingVariables.join(', ')}.`,
          503,
          'EMAIL_CONFIGURATION_ERROR'
        );
      }

      try {
        const transporter = createTransport(mode === 'demo'
          ? { jsonTransport: true }
          : { host, port, secure, auth: { user, pass: password } });
        const delivery = await transporter.sendMail({
          from,
          to,
          replyTo: from,
          subject: 'Phản hồi yêu cầu hỗ trợ từ YAMI',
          text: [
            `Xin chào ${name},`,
            '',
            replyMessage,
            '',
            '--- Nội dung yêu cầu ban đầu ---',
            originalMessage
          ].join('\n')
        });
        return { ...delivery, simulated: mode === 'demo' };
      } catch (error) {
        logger.error('Support reply email delivery failed:', error);
        throw new AppError(
          'Không gửi được email phản hồi. Vui lòng kiểm tra cấu hình SMTP và thử lại.',
          502,
          'EMAIL_DELIVERY_ERROR'
        );
      }
    }
  };
};

export { createEmailService };
