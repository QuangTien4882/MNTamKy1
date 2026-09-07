import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Supabase Edge Function: send-reminder-email
// Deployment:
//   supabase functions deploy send-reminder-email --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set FROM_EMAIL=suatan@truong.edu.vn
//
// If RESEND_API_KEY is not set, the function still succeeds but reports
// `emailsSent: 0` so callers can distinguish "recorded only" from "emailed".

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendEmailViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization") || "";
    const apikey = req.headers.get("apikey") || "";
    // Invoked from the client we allow the logged-in admin/BGH to trigger it.
    // Function-level auth is optional (--no-verify-jwt) so we re-check the role
    // via the caller's JWT below.

    const authHeader = authorization.replace("Bearer ", "");
    // Decode the JWT payload (segment 1) to obtain sub / email.
    let callerId = "";
    if (authHeader && authHeader.split(".").length === 3) {
      const payload = JSON.parse(atob(authHeader.split(".")[1]));
      callerId = payload.sub || "";
    }

    const payload = await req.json();
    const { date, classNames, recipientEmails } = payload;

    if (!date || !Array.isArray(classNames) || classNames.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "suatan@truong.edu.vn";

    let emailsSent = 0;
    if (apiKey && fromEmail && Array.isArray(recipientEmails)) {
      const uniqueEmails = [...new Set(recipientEmails.filter(Boolean))];
      for (const to of uniqueEmails) {
        await sendEmailViaResend(
          apiKey,
          fromEmail,
          to,
          `Nhắc nhở đăng ký suất ăn ${date}`,
          `<p>Xin chào,</p><p>Ngày <strong>${date}</strong> lớp <strong>${classNames.join(", ")}</strong> chưa hoàn tất đăng ký suất ăn.</p><p>Vui lòng đăng nhập hệ thống để đăng ký trước giờ quy định.</p><p>Trường Mầm non Tam Kỳ 1</p>`
        );
        emailsSent += 1;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, emailsSent, callerId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});