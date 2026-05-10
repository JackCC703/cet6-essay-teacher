import { Target } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";
import { cn } from "@/lib/utils";

const verdictLabel: Record<EssayReview["relevance"]["verdict"], string> = {
  on_topic: "扣题",
  partially_off_topic: "部分偏题",
  off_topic: "跑题",
};

const verdictClassName: Record<EssayReview["relevance"]["verdict"], string> = {
  on_topic: "border-success/30 bg-emerald-50 text-success",
  partially_off_topic: "border-warning/30 bg-amber-50 text-warning",
  off_topic: "border-danger/30 bg-red-50 text-danger",
};

type RelevanceAnalysisProps = {
  relevance: EssayReview["relevance"];
};

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">暂无</p>;
  }

  return (
    <ul className="space-y-1 text-sm leading-6 text-ink">
      {items.map((item, index) => (
        <li className="flex gap-2" key={`${item}-${index}`}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-focus" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function RelevanceAnalysis({ relevance }: RelevanceAnalysisProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Target className="h-4 w-4" />
          扣题分析
        </div>
        <span
          className={cn(
            "rounded-md border px-2.5 py-1 text-sm font-medium",
            verdictClassName[relevance.verdict],
          )}
        >
          {verdictLabel[relevance.verdict]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink">
        {relevance.explanation}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">题目要求</h3>
          <BulletList items={relevance.taskRequirements} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">已完成</h3>
          <BulletList items={relevance.completed} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">缺失</h3>
          <BulletList items={relevance.missing} />
        </div>
      </div>
    </section>
  );
}
