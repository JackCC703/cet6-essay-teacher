import { BarChart3 } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";
import { cn } from "@/lib/utils";

const levelLabel: Record<EssayReview["scoreBreakdown"][number]["level"], string> = {
  weak: "薄弱",
  fair: "基本",
  good: "较好",
};

const levelClassName: Record<
  EssayReview["scoreBreakdown"][number]["level"],
  string
> = {
  weak: "border-danger/30 bg-red-50 text-danger",
  fair: "border-warning/30 bg-amber-50 text-warning",
  good: "border-success/30 bg-emerald-50 text-success",
};

type ScoreBreakdownProps = {
  breakdown: EssayReview["scoreBreakdown"];
};

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <BarChart3 className="h-4 w-4" />
        评分维度拆解
      </div>
      <div className="mt-3 divide-y divide-line">
        {breakdown.map((item) => (
          <div
            className="grid gap-2 py-3 text-sm leading-6 first:pt-0 last:pb-0 md:grid-cols-[160px_74px_1fr]"
            key={item.dimension}
          >
            <div className="font-semibold text-ink">{item.label}</div>
            <div>
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                  levelClassName[item.level],
                )}
              >
                {levelLabel[item.level]}
              </span>
            </div>
            <div className="text-ink">{item.comment}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
