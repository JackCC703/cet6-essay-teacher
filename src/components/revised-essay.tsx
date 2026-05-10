import { FileText } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";

type RevisedEssayProps = {
  revisedEssay: EssayReview["revisedEssay"];
};

export function RevisedEssay({ revisedEssay }: RevisedEssayProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <FileText className="h-4 w-4" />
        完整改后文章
      </div>
      <div className="mt-4 whitespace-pre-wrap rounded-md border border-line bg-paper p-3 text-sm leading-7 text-ink">
        {revisedEssay.content}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-muted">修改说明</h3>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-ink">
        {revisedEssay.explanations.map((item, index) => (
          <li className="flex gap-2" key={`${item}-${index}`}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-focus" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
