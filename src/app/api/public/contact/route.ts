import { NextResponse } from "next/server";
import { createContactTrack } from "@/models/contact-track.model";
import { sendSurveyEmail } from "@/lib/survey-delivery";

const CONTACT_RECIPIENTS = [
  "roswellg@gmail.com",
  "blockchainstar0713@gmail.com",
] as const;

function textOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = textOrNull(body.name);
    const email = textOrNull(body.email);
    const message = textOrNull(body.message);

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, message: "Name, email and message are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, message: "Please enter a valid email." }, { status: 400 });
    }

    await createContactTrack({
      case_number: null,
      clinic: null,
      type: null,
      reason: "homepage_contact",
      name,
      dob: null,
      email,
      cel: null,
      subject: "Homepage Contact",
      message,
      date: new Date(),
      assign: null,
      status: 1,
      priority: 2,
      lang: "en",
      besttime: null,
    });

    const html = `
      <h2>New Home Landing Contact</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    `;
    const text = `New Home Landing Contact\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`;
    const emailResult = await sendSurveyEmail({
      to: CONTACT_RECIPIENTS.join(","),
      subject: "New Contact from Home Landing",
      html,
      text,
    });
    if (!emailResult.ok) {
      return NextResponse.json({ ok: false, message: emailResult.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
