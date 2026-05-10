import { Dumbbell } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";

type NextPracticeProps = {
  nextPractice: EssayReview["nextPractice"];
};

export function NextPractice({ nextPractice }: NextPracticeProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Dumbbell className="h-4 w-4" />
        下一篇练什么
      </div>
      <p className="mt-3 text-sm leading-6 text-ink">{nextPractice.focus}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {nextPractice.drills.map((drill, index) => (
          <article
            className="rounded-md border border-line bg-paper p-3"
            key={`${drill.title}-${index}`}
          >
            <h3 className="text-sm font-semibold text-ink">{drill.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {drill.instruction}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
