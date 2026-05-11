"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";
import { Button, buttonClassName } from "./ui";

export function WhatsAppDraft({ lead, auditScore }: { lead: Lead; auditScore?: number }) {
  const [message, setMessage] = useState("");
  const businessName = lead.businessName;
  const city = lead.city;
  const category = lead.category;
  const score = auditScore;
  const draft = `Hi, I'm reaching out from GrowingMonk.

We did a quick public visibility audit for ${businessName} in ${city} and noticed a few gaps in your Google presence, reviews, and enquiry flow that local competitors are likely taking advantage of.

${score ? `Your growth readiness score came out at ${score}/100 — there's clear room to improve enquiries from Google and Instagram.` : ""}

We've helped other ${category} businesses in ${city} improve their local ranking, reviews, and customer enquiries within 30 days.

Would you be open to a 15-minute call to share what we found? No sales pitch — just the findings and what can be fixed quickly.

— GrowingMonk Team`;
  const whatsappHref = lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, "")}` : "";

  function copyMessage() {
    void navigator.clipboard.writeText(draft).then(() => setMessage("Copied!"));
  }

  return (
    <div className="space-y-3">
      <textarea
        readOnly
        value={draft}
        className="min-h-[180px] w-full border border-stoneLine bg-ivory p-3 text-sm leading-6 text-ink"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copyMessage}>Copy message</Button>
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonClassName("secondary")}>
            Open in WhatsApp
          </a>
        ) : null}
      </div>
      {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
    </div>
  );
}
