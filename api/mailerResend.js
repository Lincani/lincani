const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail(to) {
  const from = process.env.RESEND_FROM || "BreedLink <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: "BreedLink: Resend test email ✅",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>BreedLink Email System</h2>
        <p>If you’re reading this, Resend is wired up correctly.</p>
        <p><strong>Status:</strong> ✅ Working</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }

  return data;
}

module.exports = { sendTestEmail };
