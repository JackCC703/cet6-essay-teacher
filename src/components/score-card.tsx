import { CheckCircle2, Gauge } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";
import { cn } from "@/lib/utils";

const levelLabel: Record<EssayReview["score"]["level"], string> = {
  low: "低分",
  medium: "中等",
  high: "较好",
};

const levelClassName: Record<EssayReview["score"]["level"], string> = {
  low: "border-danger/30 bg-red-50 text-danger",
  medium: "border-warning/30 bg-amber-50 text-warning",
  high: "border-success/30 bg-emerald-50 text-success",
};

type ScoreCardProps = {
  score: EssayReview["score"];
};

export function ScoreCard({ score }: ScoreCardProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted">
            <Gauge className="h-4 w-4" />
            总体评分
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <span className="text-4xl font-semibold tracking-normal text-ink">
                {score.raw}
              </span>
              <span className="ml-1 text-sm text-muted">/ 15</span>
            </div>
            <div className="pb-1 text-sm text-muted">
              折算 {score.converted.toFixed(1)} / 106.5
            </div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-medium",
            levelClassName[score.level],
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {levelLabel[score.level]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink">{score.summary}</p>
    </section>
  );
}
