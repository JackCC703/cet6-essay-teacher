import { AlertTriangle } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";

type MajorProblemsProps = {
  problems: EssayReview["majorProblems"];
};

export function MajorProblems({ problems }: MajorProblemsProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <AlertTriangle className="h-4 w-4" />
        最大失分问题
      </div>
      <div className="mt-4 space-y-3">
        {problems.slice(0, 3).map((problem, index) => (
          <article
            className="rounded-md border border-line bg-paper p-3"
            key={`${problem.title}-${index}`}
          >
            <h3 className="text-sm font-semibold text-ink">
              {index + 1}. {problem.title}
            </h3>
            <dl className="mt-2 grid gap-2 text-sm leading-6 text-ink">
              <div>
                <dt className="font-medium text-muted">原文证据</dt>
                <dd>{problem.evidence}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">为什么扣分</dt>
                <dd>{problem.impact}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">怎么改</dt>
                <dd>{problem.suggestion}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
