/* eslint-disable import/no-unresolved -- Deno URL / jsr imports are resolved at runtime */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { cleanName, escapeHtml, resolveAppUrl, statusForClaimError } from "../_shared/invite.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Provided to every edge function by Supabase.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Optional, comma-separated: extra origins the invite link may point at.
const INVITE_ALLOWED_ORIGINS = Deno.env.get("INVITE_ALLOWED_ORIGINS") ?? "";

/**
 * Old app builds send { partnerEmail, inviterName, appUrl }. Only
 * partnerEmail is trusted (and checked by the database); the name comes
 * from the caller's profile and the link from an allowlist.
 */
interface InviteRequest {
	partnerEmail?: unknown;
	appUrl?: unknown;
}

const json = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});

serve(async (req) => {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}
	if (req.method !== "POST") {
		return json({ error: "Method not allowed" }, 405);
	}

	try {
		// The anon key is itself a valid JWT, so the platform's verify_jwt
		// check alone lets anyone through. Require a real signed-in user.
		const authHeader = req.headers.get("Authorization") ?? "";
		if (!authHeader.startsWith("Bearer ")) {
			return json({ error: "Not authenticated" }, 401);
		}
		const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			global: { headers: { Authorization: authHeader } },
			auth: { persistSession: false, autoRefreshToken: false },
		});
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser(authHeader.slice("Bearer ".length));
		if (userError || !user) {
			return json({ error: "Not authenticated" }, 401);
		}

		const body: InviteRequest = await req.json().catch(() => ({}));
		const partnerEmail =
			typeof body.partnerEmail === "string" ? body.partnerEmail.trim().toLowerCase() : "";
		if (!partnerEmail) {
			return json({ error: "Missing partner email" }, 400);
		}

		if (!RESEND_API_KEY) {
			console.error("RESEND_API_KEY not configured");
			return json({ error: "Email service not configured" }, 500);
		}

		// Checks the caller may invite this address, enforces the rate limits,
		// records the send and returns the caller's display name (migration 027).
		const { data: claimedName, error: claimError } = await supabase.rpc("claim_partner_invite", {
			p_partner_email: partnerEmail,
		});
		if (claimError) {
			const status = statusForClaimError(claimError.code);
			if (status === 500) console.error("claim_partner_invite failed:", claimError);
			return json({ error: status === 500 ? "Could not send invite" : claimError.message }, status);
		}

		const inviterName = cleanName(typeof claimedName === "string" ? claimedName : "");
		const appUrl = resolveAppUrl(body.appUrl, INVITE_ALLOWED_ORIGINS);
		const safeName = escapeHtml(inviterName);
		const safeEmail = escapeHtml(partnerEmail);
		const safeUrl = escapeHtml(appUrl);

		// Email HTML template. Every interpolated value is escaped above.
		const emailHtml = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>You've been invited to Duo!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
					<!-- Header with heart icon -->
					<tr>
						<td style="background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); padding: 40px 40px 30px; text-align: center;">
							<div style="font-size: 48px; margin-bottom: 16px;">💛</div>
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You've been invited to Duo!</h1>
						</td>
					</tr>

					<!-- Main content -->
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
								Hi there! 👋
							</p>

							<p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
								<strong>${safeName}</strong> has invited you to join them on <strong>Duo</strong> — the app for couples to make decisions together.
							</p>

							<div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 24px 0; border-radius: 4px;">
								<p style="margin: 0; font-size: 14px; color: #92400E; line-height: 1.6;">
									<strong>📧 Important:</strong> Sign up using this exact email address: <strong>${safeEmail}</strong>
								</p>
							</div>

							<h2 style="margin: 32px 0 16px; font-size: 20px; font-weight: 600; color: #111827;">Getting Started:</h2>

							<ol style="margin: 0 0 32px; padding-left: 24px; font-size: 16px; line-height: 1.8; color: #374151;">
								<li style="margin-bottom: 12px;">Click the button below to open Duo</li>
								<li style="margin-bottom: 12px;">Sign up with this email: <code style="background-color: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${safeEmail}</code></li>
								<li style="margin-bottom: 12px;">You'll be automatically linked as partners</li>
								<li>Start making decisions together! 🎉</li>
							</ol>

							<!-- CTA Button -->
							<table width="100%" cellpadding="0" cellspacing="0">
								<tr>
									<td align="center" style="padding: 20px 0;">
										<a href="${safeUrl}" style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
											Join ${safeName} on Duo
										</a>
									</td>
								</tr>
							</table>

							<p style="margin: 32px 0 0; font-size: 14px; line-height: 1.6; color: #6B7280; text-align: center;">
								Or copy and paste this link into your browser:<br>
								<a href="${safeUrl}" style="color: #F59E0B; text-decoration: none; word-break: break-all;">${safeUrl}</a>
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="background-color: #F9FAFB; padding: 24px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
							<p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">
								💛 Making decisions together, one choice at a time
							</p>
							<p style="margin: 0; font-size: 12px; color: #9CA3AF;">
								Questions? Just reply to this email.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
		`;

		// Send email via Resend API
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${RESEND_API_KEY}`,
			},
			body: JSON.stringify({
				from: "hello@duo-decide.com",
				to: partnerEmail,
				subject: `${inviterName} invited you to join Duo!`,
				html: emailHtml,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("Resend API error:", data);
			return json({ error: "Failed to send email" }, 502);
		}

		return json({ success: true, emailId: data.id }, 200);
	} catch (error) {
		console.error("Error in send-partner-invite function:", error);
		return json({ error: "Could not send invite" }, 500);
	}
});
