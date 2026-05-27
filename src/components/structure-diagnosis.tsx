import { LayoutList } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";
import { cn } from "@/lib/utils";

const statusLabel: Record<
  EssayReview["structureDiagnosis"][number]["status"],
  string
> = {
  missing: "缺失",
  weak: "待加强",
  ok: "完成",
};

const statusClassName: Record<
  EssayReview["structureDiagnosis"][number]["status"],
  string
> = {
  missing: "border-danger/30 bg-red-50 text-danger",
  weak: "border-warning/30 bg-amber-50 text-warning",
  ok: "border-success/30 bg-emerald-50 text-success",
};

type StructureDiagnosisProps = {
  diagnosis: EssayReview["structureDiagnosis"];
};

export function StructureDiagnosis({ diagnosis }: StructureDiagnosisProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <LayoutList className="h-4 w-4" />
        原文结构诊断
      </div>
      <div className="mt-3 divide-y divide-line">
        {diagnosis.map((item) => (
          <div
            className="grid gap-2 py-3 text-sm leading-6 first:pt-0 last:pb-0 md:grid-cols-[92px_74px_1fr]"
            key={item.section}
          >
            <div className="font-semibold text-ink">{item.label}</div>
            <div>
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                  statusClassName[item.status],
                )}
              >
                {statusLabel[item.status]}
              </span>
            </div>
            <div>
              <p className="text-ink">{item.finding}</p>
              <p className="mt-1 text-muted">{item.suggestion}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
