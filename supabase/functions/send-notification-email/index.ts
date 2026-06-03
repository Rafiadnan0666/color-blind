import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  const { to, subject, body } = await req.json();

  if (!to || !subject || !body) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "noreply@clrblind.app";

  if (!resendKey) {
    console.warn("RESEND_API_KEY not set; email not sent");
    return new Response(JSON.stringify({ ok: false, reason: "no resend key" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `ClrBlind <${fromEmail}>`,
      to: [to],
      subject,
      html: body,
    }),
  });

  const data = await res.json();

  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
});
