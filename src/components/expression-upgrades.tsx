import { Wand2 } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";

type ExpressionUpgradesProps = {
  upgrades: EssayReview["expressionUpgrades"];
};

export function ExpressionUpgrades({ upgrades }: ExpressionUpgradesProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Wand2 className="h-4 w-4" />
        表达升级
      </div>
      <div className="mt-4 space-y-3">
        {upgrades.map((item, index) => (
          <article
            className="rounded-md border border-line bg-paper p-3"
            key={`${item.original}-${index}`}
          >
            <h3 className="text-sm font-semibold text-ink">
              升级句 {index + 1}
            </h3>
            <dl className="mt-2 grid gap-2 text-sm leading-6">
              <div>
                <dt className="font-medium text-muted">原句</dt>
                <dd className="text-ink">{item.original}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">问题</dt>
                <dd className="text-ink">{item.problem}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">稳妥版</dt>
                <dd className="text-success">{item.saferVersion}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">高分版</dt>
                <dd className="text-focus">{item.advancedVersion}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">为什么这样改</dt>
                <dd className="text-ink">{item.explanation}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
