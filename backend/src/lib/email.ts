import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? 'noreply@splitlink.com';

export async function sendSaleNotification(opts: {
  merchantEmail: string;
  merchantName: string;
  productTitle: string;
  grossAmount: number;
  merchantPayout: number;
  currency: string;
  buyerEmail?: string;
}) {
  const amount = (opts.grossAmount / 100).toFixed(2);
  const payout = (opts.merchantPayout / 100).toFixed(2);
  const curr = opts.currency.toUpperCase();

  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: opts.merchantEmail,
    subject: `You made a sale! ${curr} ${amount} for "${opts.productTitle}"`,
    html: `
      <h2>You made a sale!</h2>
      <p>Hi ${opts.merchantName},</p>
      <p><strong>${opts.productTitle}</strong> just sold for <strong>${curr} ${amount}</strong>.</p>
      <p>Your payout: <strong>${curr} ${payout}</strong> (after platform fee and affiliate commission).</p>
      ${opts.buyerEmail ? `<p>Buyer: ${opts.buyerEmail}</p>` : ''}
      <p>Log in to your dashboard to see the full breakdown.</p>
    `,
  });
}

export async function sendCommissionNotification(opts: {
  affiliateEmail: string;
  affiliateName: string;
  productTitle: string;
  commissionAmount: number;
  currency: string;
}) {
  const commission = (opts.commissionAmount / 100).toFixed(2);
  const curr = opts.currency.toUpperCase();

  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: opts.affiliateEmail,
    subject: `Commission earned! ${curr} ${commission} from "${opts.productTitle}"`,
    html: `
      <h2>You earned a commission!</h2>
      <p>Hi ${opts.affiliateName},</p>
      <p>Someone bought <strong>${opts.productTitle}</strong> through your link.</p>
      <p>Your commission: <strong>${curr} ${commission}</strong></p>
      <p>Log in to your affiliate dashboard to track your earnings.</p>
    `,
  });
}
