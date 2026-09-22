import axios from 'axios';
import { config } from '../config.js';
import { dbService } from '../db/database.js';
import { logger } from '../utils/logger.js';

export const brevoService = {
  getApiKey() {
    return dbService.getSetting('BREVO_API_KEY') || config.brevo.apiKey || process.env.BREVO_API_KEY || '';
  },

  getListId() {
    const setting = dbService.getSetting('BREVO_LIST_ID');
    return setting ? parseInt(setting, 10) : config.brevo.listId;
  },

  getSenderInfo() {
    const senderName = dbService.getSetting('BREVO_SENDER_NAME') || config.brevo.senderName;
    const senderEmail = dbService.getSetting('BREVO_SENDER_EMAIL') || config.brevo.senderEmail;
    return { name: senderName, email: senderEmail };
  },

  /**
   * Subscribe an email contact to Brevo list
   * Implements section 3 of TrendyHits 2.md
   */
  async subscribeContact(email) {
    const apiKey = this.getApiKey();
    const listId = this.getListId();

    // 1. Always record in local database
    const localSub = dbService.addSubscriber(email);

    // 2. If API Key is present, push to Brevo API
    if (apiKey) {
      try {
        const response = await axios.post(
          'https://api.brevo.com/v3/contacts',
          {
            email: email,
            listIds: [listId],
            updateEnabled: true
          },
          {
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );

        logger.success('Newsletter', `Contact added to Brevo list (${listId}): ${email}`);
        return {
          success: true,
          mode: 'brevo_live',
          message: 'Bültene başarıyla kaydoldunuz! (Brevo senkronize edildi)',
          brevoData: response.data,
          subscriber: localSub
        };
      } catch (error) {
        const errMsg = error.response?.data?.message || error.message;
        logger.warn('Newsletter', `Brevo API sync notice: ${errMsg}`);
        return {
          success: true,
          mode: 'local_fallback',
          message: 'Bülten aboneliğiniz yerel olarak kaydedildi (Brevo senkronizasyon uyarısı: ' + errMsg + ')',
          subscriber: localSub
        };
      }
    } else {
      // Sandbox / Local mode
      logger.info('Newsletter', `Local subscriber saved (Brevo API key not set): ${email}`);
      return {
        success: true,
        mode: 'local_only',
        message: 'Bültene başarıyla kaydoldunuz! (Test/Yerel mod: Gerçek e-posta gönderimi için Ayarlar\'dan Brevo API Key tanımlayabilirsiniz)',
        subscriber: localSub
      };
    }
  },

  /**
   * Send transactional / campaign email via Brevo SMTP API
   * Implements section 4 of TrendyHits 2.md
   */
  async sendEmail({ to, subject, htmlContent, sender = null }) {
    const apiKey = this.getApiKey();
    const senderInfo = sender || this.getSenderInfo();
    const recipients = Array.isArray(to) ? to : [{ email: to }];

    if (apiKey) {
      try {
        const payload = {
          sender: senderInfo,
          to: recipients,
          subject: subject,
          htmlContent: htmlContent
        };

        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          payload,
          {
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const messageId = response.data?.messageId || 'brevo-sent';
        dbService.saveNewsletter(subject, recipients.length, messageId, 'sent', htmlContent);
        logger.success('Newsletter', `Newsletter dispatched via Brevo to ${recipients.length} recipient(s). ID: ${messageId}`);

        return {
          success: true,
          mode: 'brevo_live',
          messageId: messageId,
          recipientsCount: recipients.length
        };
      } catch (error) {
        const errMsg = error.response?.data?.message || error.message;
        logger.error('Newsletter', `Brevo dispatch failed: ${errMsg}`);
        dbService.saveNewsletter(subject, recipients.length, null, 'failed', htmlContent);
        throw new Error(`Brevo Gönderim Hatası: ${errMsg}`);
      }
    } else {
      // Simulated delivery
      const simulatedId = 'sim-' + Date.now();
      dbService.saveNewsletter(subject, recipients.length, simulatedId, 'simulated', htmlContent);
      logger.info('Newsletter', `[Simulated] Email compiled & dispatched for ${recipients.length} recipients. (Configure Brevo API Key to send live emails)`);

      return {
        success: true,
        mode: 'simulated',
        messageId: simulatedId,
        recipientsCount: recipients.length,
        notice: 'Simüle edildi: Gerçek gönderim için Brevo API Key giriniz.'
      };
    }
  }
};
