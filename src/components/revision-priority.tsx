import { ListChecks } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";

type RevisionPriorityProps = {
  priority: EssayReview["revisionPriority"];
};

export function RevisionPriority({ priority }: RevisionPriorityProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <ListChecks className="h-4 w-4" />
        优先修改顺序
      </div>
      <ol className="mt-3 space-y-3">
        {priority.steps.map((step) => (
          <li className="flex gap-3 text-sm leading-6" key={step.order}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-focus text-xs font-semibold text-white">
              {step.order}
            </span>
            <div>
              <div className="font-semibold text-ink">{step.action}</div>
              <div className="text-muted">{step.reason}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
