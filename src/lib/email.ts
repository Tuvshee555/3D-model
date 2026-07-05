// Sends transactional email via Resend's REST API. No-ops (returns false)
// unless RESEND_API_KEY is set, so signup still works without email configured.

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, ...options }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendWelcomeEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Welcome to Outfit Copilot",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h1 style="color:#3366ff">Welcome to Outfit Copilot 👋</h1>
        <p>Your account is ready. You can now create a store, add your catalog,
        and drop the virtual try-on widget on your product pages.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard"
          style="display:inline-block;background:#3366ff;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">
          Go to your dashboard</a></p>
        <p style="color:#888;font-size:12px">Virtually yours — try before you buy.</p>
      </div>
    `,
  });
}
