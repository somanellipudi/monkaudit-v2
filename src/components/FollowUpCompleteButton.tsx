"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "./ui";

export function FollowUpCompleteButton({ followUpId }: { followUpId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function complete() {
    setSaving(true);
    await fetch(`/api/follow-ups/${followUpId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Completed" })
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" onClick={() => void complete()} disabled={saving}>
      <CheckCircle2 size={15} /> {saving ? "Saving" : "Done"}
    </Button>
  );
}
