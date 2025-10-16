/* eslint-env node */
/* global process */
import { Buffer } from "node:buffer";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import sgMail from "@sendgrid/mail";
import PDFDocument from "pdfkit";

initializeApp();
const db = getFirestore();

// ---- Env ----
const ORIGIN             = process.env.CORS_ORIGIN || "http://localhost:5173";
const SENDGRID_KEY       = process.env.SENDGRID_KEY;
const FROM_EMAIL         = process.env.MAIL_FROM;
const SG_TEMPLATE_PROGRAM = process.env.SENDGRID_TEMPLATE_ID_PROGRAM || null;


// CORS wrapper (concise)
function withCors(handler) {
  return async (req, res) => {
    const origin = req.headers.origin || ORIGIN;
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin, Access-Control-Request-Headers, Access-Control-Request-Method");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      await handler(req, res);
    } catch (e) {
      const detail = e?.message || String(e);
      console.error("Handler error:", detail);
      return res.status(500).json({ error: "failed", detail });
    }
  };
}

// Require a valid Firebase ID token
async function requireUser(req) {
  const authHeader = req.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    const err = new Error("missing-token");
    err.statusCode = 401;
    throw err;
  }
  try {
    const idToken = authHeader.slice("Bearer ".length);
    return await getAdminAuth().verifyIdToken(idToken, true);
  } catch {
    const err = new Error("invalid-token");
    err.statusCode = 401;
    throw err;
  }
}

// Build  program PDF
function buildProgramPDF(program) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Walking Football Program", { underline: true });
    doc.moveDown();
    doc.fontSize(14).text(program?.name || "Program");
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Location: ${program?.location || "-"}`);
    doc.text(`Schedule: ${program?.schedule || "-"}`);
    doc.text(`Difficulty: ${program?.difficulty || "-"}`);
    doc.moveDown();
    doc.text(program?.description || "Program details attached.");
    doc.end();
  });
}

function isEmail(x = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x));
}

function parseRecipients(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String).map(s => s.trim()).filter(Boolean);
  return String(input)
    .split(/[,\s;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* =========================
   Email: single brochure
========================= */
export const sendProgramEmailHttp = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  withCors(async (req, res) => {

    let user;
    try {
      user = await requireUser(req);
    } catch (e) {
      return res.status(e.statusCode || 401).json({ error: e.message });
    }


    if (!SENDGRID_KEY || !FROM_EMAIL) {
      return res.status(500).json({ error: "failed", detail: "Missing SENDGRID_KEY or MAIL_FROM env var" });
    }
    sgMail.setApiKey(SENDGRID_KEY);


    const to = String(req.body?.to || "").trim();
    const subject = String(req.body?.subject || "Your Walking Football Program Brochure").trim();
    const programId = String(req.body?.programId || "");
    const programPayload = req.body?.program || null;
    const messageHtml = String(req.body?.messageHtml || "");

    if (!isEmail(to)) {
      return res.status(400).json({ error: "invalid-argument", detail: "Invalid recipient email." });
    }

    // Load/derive program
    let program;
    if (programId) {
      const progSnap = await db.doc(`programs/${programId}`).get();
      if (!progSnap.exists) {
        return res.status(400).json({ error: "bad-program", detail: "Program not found." });
      }
      program = progSnap.data();
    } else if (programPayload) {
      program = programPayload;
    } else {
      program = {
        name: "Walking Football – Community Session",
        location: "Melbourne",
        schedule: "Fridays 11:00–12:30",
        difficulty: "Beginner",
        description: "Inclusive, low-impact football. All fitness levels welcome.",
      };
    }

    // PDF attachment
    const pdfBuffer = await buildProgramPDF(program);
    const base64PDF = pdfBuffer.toString("base64");
    const attachments = [
      {
        content: base64PDF,
        filename: "program-brochure.pdf",
        type: "application/pdf",
        disposition: "attachment",
      },
    ];

    // Message
    const msg = SG_TEMPLATE_PROGRAM
      ? {
          to,
          from: { email: FROM_EMAIL, name: "Walking Football Hub" },
          subject,
          templateId: SG_TEMPLATE_PROGRAM,
          dynamicTemplateData: {
            programName: program.name,
            location: program.location,
            schedule: program.schedule,
            difficulty: program.difficulty,
            messageHtml,
          },
          attachments,
          categories: ["program_brochure"],
          customArgs: { programId: programId || "na" },
        }
      : {
          to,
          from: FROM_EMAIL,
          subject,
          html: `
            <p>Hi,</p>
            ${messageHtml || ""}
            <p>Find attached the brochure for <strong>${program.name}</strong>.</p>
            <p>Location: ${program.location}<br/>
               Schedule: ${program.schedule}<br/>
               Difficulty: ${program.difficulty}</p>
            <p>Thanks,<br/>Walking Football Hub</p>
          `,
          attachments,
          categories: ["program_brochure"],
          customArgs: { programId: programId || "na" },
        };


    const logRef = await db.collection("email_outbox").add({
      to,
      subject,
      programId: programId || null,
      programMeta: {
        name: program?.name || "",
        location: program?.location || "",
        schedule: program?.schedule || "",
        difficulty: program?.difficulty || "",
      },
      templateId: SG_TEMPLATE_PROGRAM || null,
      status: "queued",
      initiatedBy: user.uid,
      createdAt: new Date(),
    });

    try {
      const [resp] = await sgMail.send(msg);
      const sgMessageId = resp?.headers?.["x-message-id"] || null;
      await logRef.update({ status: "sent", sgMessageId, sentAt: new Date() });
      return res.json({ ok: true, id: logRef.id, sgMessageId });
    } catch (e) {
      const sgErrors = e?.response?.body?.errors || null;
      await logRef.update({
        status: "failed",
        error: e?.message || String(e),
        sgErrors,
        failedAt: new Date(),
      });
      console.error("sendProgramEmailHttp error:", e?.message, sgErrors);
      return res.status(500).json({ error: "failed", detail: e?.message || String(e), sgErrors });
    }
  })
);

/* =========================
   Email: bulk sender
========================= */
export const sendBulkEmailHttp = onRequest(
  { region: "us-central1", timeoutSeconds: 300 },
  withCors(async (req, res) => {
    // Auth
    let user;
    try {
      user = await requireUser(req);
    } catch (e) {
      return res.status(e.statusCode || 401).json({ error: e.message });
    }

    // Env
    if (!SENDGRID_KEY || !FROM_EMAIL) {
      return res.status(500).json({ error: "failed", detail: "Missing SENDGRID_KEY or MAIL_FROM env var" });
    }
    sgMail.setApiKey(SENDGRID_KEY);

    // Input
    const body = req.body || {};
    const recipients = parseRecipients(body.to);
    const subject = String(body.subject || "").trim();
    const text = String(body.text || "").trim();
    const batchSize = Math.max(1, Math.min(Number(body.batchSize) || 995, 995));

    if (!recipients.length) return res.status(400).json({ error: "invalid-argument", detail: "Provide at least one recipient in 'to'." });
    if (!subject || !text)  return res.status(400).json({ error: "invalid-argument", detail: "Subject and text are required." });

    const batches = chunk(recipients, batchSize);
    const logRef = await db.collection("email_outbox_bulk").add({
      subject,
      by: user.uid,
      email: user.email || null,
      totalRecipients: recipients.length,
      batches: batches.length,
      status: "sending",
      createdAt: new Date(),
    });

    let sent = 0;
    for (let i = 0; i < batches.length; i++) {
      const slice = batches[i];
      const msg = {
        from: FROM_EMAIL,
        subject,
        personalizations: slice.map((addr) => ({ to: [{ email: addr }] })),
        text,
        categories: ["bulk_email"],
        customArgs: { bulkLogId: logRef.id, batchIndex: i },
      };

      try {
        await sgMail.send(msg);
        sent += slice.length;
      } catch (e) {
        console.warn(`Batch ${i + 1}/${batches.length} failed:`, e.message);
      }
    }

    await logRef.update({
      sent,
      status: "completed",
      finishedAt: new Date(),
    });

    return res.json({ ok: true, sent, total: recipients.length });
  })
);

/* =========================
   Public lightweight APIs (read-only)
========================= */

// GET /apiProgramsLite
export const apiProgramsLite = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "GET") return res.status(405).json({ error: "method-not-allowed" });

    try {
      const snap = await db.collection("programs").orderBy("name").limit(100).get();
      const data = snap.docs.map(d => {
        const p = d.data();
        return {
          id: d.id,
          name: p.name || "",
          location: p.location || "",
          schedule: p.schedule || "",
          difficulty: p.difficulty || "",
          available: p.available !== false,
          maxParticipants: Number(p.maxParticipants || 0) || 0,
          currentParticipants: Number(p.currentParticipants || 0) || 0,
        };
      });
      return res.json({ items: data, ts: Date.now() });
    } catch (e) {
      console.error("apiProgramsLite error:", e);
      return res.status(500).json({ error: "failed", detail: e?.message || String(e) });
    }
  }
);

// GET /apiStatsLite
export const apiStatsLite = onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "GET") return res.status(405).json({ error: "method-not-allowed" });

    try {
      const progSnap = await db.collection("programs").get();
      const totalPrograms = progSnap.size;


      let totalRatings = 0;
      let weightedSum = 0;

      progSnap.docs.forEach(doc => {
        const p = doc.data();
        const count = Number(p.ratingCount || 0);
        const avg = Number(p.ratingAvg || 0);
        totalRatings += count;
        weightedSum += avg * count;
      });

      const avgRatingAllPrograms =
        totalRatings > 0 ? Number((weightedSum / totalRatings).toFixed(2)) : 0;

      return res.json({
        totalPrograms,
        avgRatingAllPrograms
      });
    } catch (e) {
      console.error("apiStatsLite error:", e);
      return res.status(500).json({
        error: "failed",
        detail: e?.message || String(e)
      });
    }
  }
);
