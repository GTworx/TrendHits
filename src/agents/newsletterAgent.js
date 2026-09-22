import { logger } from '../utils/logger.js';
import { dbService } from '../db/database.js';
import { brevoService } from '../services/brevoService.js';

export const newsletterAgent = {
  name: 'Newsletter',

  async generateNewsletterHtml({ topCount = 10, websiteUrl = 'http://localhost:3000' } = {}) {
    logger.info(this.name, '📝 Generating 2-Column Responsive HTML Music Newsletter...');

    // 1. Gather tracks from DB
    const globalTracks = dbService.getTracksByRegion('GLOBAL').slice(0, topCount);
    const turkeyTracks = dbService.getTracksByRegion('TR').slice(0, topCount);

    const dateFormatted = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Generate table rows for Global
    const globalRowsHtml = globalTracks
      .map(
        (t) => {
          const playerUrl = t.player_url || `https://open.spotify.com/search/${encodeURIComponent(t.artist + ' ' + t.title)}`;
          return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 6px; font-weight: bold; color: #6366f1; width: 28px; text-align: center;">#${t.rank}</td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: 600; font-size: 14px; line-height: 1.3;">
              <a href="${playerUrl}" target="_blank" style="color: #0f172a; text-decoration: none;">
                ${t.title} <span style="font-size: 11px; color: #6366f1;">▶</span>
              </a>
            </div>
            <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${t.artist}</div>
          </td>
          <td style="padding: 10px 6px; text-align: right; width: 50px;">
            <span style="background: #fef2f2; color: #ef4444; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">
              ❤️ ${t.likes_count}
            </span>
          </td>
        </tr>
      `;
        }
      )
      .join('');

    // Generate table rows for Turkey
    const trRowsHtml = turkeyTracks
      .map(
        (t) => {
          const playerUrl = t.player_url || `https://open.spotify.com/search/${encodeURIComponent(t.artist + ' ' + t.title)}`;
          return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 6px; font-weight: bold; color: #ef4444; width: 28px; text-align: center;">#${t.rank}</td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: 600; font-size: 14px; line-height: 1.3;">
              <a href="${playerUrl}" target="_blank" style="color: #0f172a; text-decoration: none;">
                ${t.title} <span style="font-size: 11px; color: #ef4444;">▶</span>
              </a>
            </div>
            <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${t.artist}</div>
          </td>
          <td style="padding: 10px 6px; text-align: right; width: 50px;">
            <span style="background: #fef2f2; color: #ef4444; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">
              ❤️ ${t.likes_count}
            </span>
          </td>
        </tr>
      `;
        }
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrendHits Müzik Bülteni</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 680px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);" cellpadding="0" cellspacing="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 36px 30px; text-align: center;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); padding: 6px 14px; border-radius: 20px; color: #a5b4fc; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;">
                Agentic AI Müzik İstihbaratı • ${dateFormatted}
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                🎧 Haftanın Hit Parçaları
              </h1>
              <p style="margin: 10px 0 0; color: #cbd5e1; font-size: 15px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                Dünyada ve Türkiye'de listeleri altüst eden güncel parçalar ve topluluk oylamalarıyla şekillenen haftalık bülten.
              </p>
            </td>
          </tr>

          <!-- Editorial Card -->
          <tr>
            <td style="padding: 24px 30px 12px;">
              <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 0 10px 10px 0; padding: 14px 18px;">
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                  <strong>⚡ Editörün Notu:</strong> Çoklu yapay zeka ajanlarımız Spotify Global, Billboard Hot 100, Spotify Türkiye ve YouTube Trendler verilerini gerçek zamanlı tarayarak bu haftanın en popüler listelerini hazırladı. Beğendiğin şarkıları web sitemizde oylayarak bir sonraki bültende zirveye taşıyabilirsin!
                </p>
              </div>
            </td>
          </tr>

          <!-- Two-Column Side-by-Side Content -->
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  
                  <!-- Left Column: Global Trends -->
                  <td width="50%" valign="top" style="padding: 0 10px 20px;">
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <div style="background: #f8fafc; border-bottom: 2px solid #6366f1; padding: 12px 14px;">
                        <h2 style="margin: 0; font-size: 15px; color: #1e1b4b; font-weight: 700;">
                          🌍 Global Top Hits
                        </h2>
                        <span style="font-size: 11px; color: #64748b;">Billboard & Spotify Global</span>
                      </div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 6px;">
                        ${globalRowsHtml}
                      </table>
                    </div>
                  </td>

                  <!-- Right Column: Turkey Trends -->
                  <td width="50%" valign="top" style="padding: 0 10px 20px;">
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <div style="background: #f8fafc; border-bottom: 2px solid #ef4444; padding: 12px 14px;">
                        <h2 style="margin: 0; font-size: 15px; color: #1e1b4b; font-weight: 700;">
                          🇹🇷 Türkiye Top Hits
                        </h2>
                        <span style="font-size: 11px; color: #64748b;">Spotify TR & YouTube Music</span>
                      </div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 6px;">
                        ${trRowsHtml}
                      </table>
                    </div>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- Call to Action (CTA) Section -->
          <tr>
            <td style="padding: 10px 30px 30px; text-align: center;">
              <div style="background: #faf5ff; border: 1px dashed #d8b4fe; border-radius: 12px; padding: 22px;">
                <h3 style="margin: 0 0 8px; color: #581c87; font-size: 16px; font-weight: 700;">
                  Sevdiğin parçaya destek ol! 🎵
                </h3>
                <p style="margin: 0 0 16px; color: #7e22ce; font-size: 13px;">
                  Sence bu haftanın 1 numarası kim olmalı? Canlı panelimize girip hemen oy ver.
                </p>
                <a href="${websiteUrl}" target="_blank" style="display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 30px; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);">
                  Canlı Listeyi Gör & Parçaları Oyla →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Bu bülten <strong>TrendHits Multi-Agent AI Orchestrator</strong> tarafından otomatik derlenmiştir.
              </p>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 11px;">
                TrendHits &copy; ${new Date().getFullYear()} • Tüm hakları saklıdır.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return html;
  },

  async dispatchNewsletter({ targetEmail = null, subject = null } = {}) {
    const defaultSubject = '🎧 Haftanın Hit Parçaları: Global & Türkiye Trendleri';
    const emailSubject = subject || defaultSubject;

    const htmlContent = await this.generateNewsletterHtml();

    let recipients = [];
    if (targetEmail) {
      recipients = [{ email: targetEmail }];
    } else {
      const subscribers = dbService.getSubscribers();
      if (subscribers.length === 0) {
        // If no active subscribers, add a default test receiver
        recipients = [{ email: 'test-subscriber@trendhits.com' }];
      } else {
        recipients = subscribers.map((s) => ({ email: s.email }));
      }
    }

    logger.info(this.name, `Dispatching newsletter to ${recipients.length} subscriber(s)...`);

    const result = await brevoService.sendEmail({
      to: recipients,
      subject: emailSubject,
      htmlContent
    });

    return {
      ...result,
      subject: emailSubject,
      recipients: recipients.map((r) => r.email),
      htmlPreview: htmlContent
    };
  }
};
