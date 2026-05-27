import { PencilLine } from "lucide-react";

import type { EssayReview } from "@/lib/review-schema";

const issueTypeLabel: Record<
  EssayReview["sentenceCorrections"][number]["issueType"],
  string
> = {
  grammar: "语法",
  word_form: "词形",
  article: "冠词",
  preposition: "介词",
  tense: "时态",
  agreement: "主谓一致",
  punctuation: "标点",
  other: "其他语法",
};

type SentenceCorrectionsProps = {
  corrections: EssayReview["sentenceCorrections"];
};

export function SentenceCorrections({
  corrections,
}: SentenceCorrectionsProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <PencilLine className="h-4 w-4" />
        逐句语法批改
      </div>
      {corrections.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          没有发现明确语法错误。
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {corrections.map((item, index) => (
            <article
              className="rounded-md border border-line bg-paper p-3"
              key={`${item.original}-${index}`}
            >
              <div className="mb-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-medium text-muted ring-1 ring-line">
                {issueTypeLabel[item.issueType]}
              </div>
              <dl className="grid gap-2 text-sm leading-6">
                <div>
                  <dt className="font-medium text-muted">原句</dt>
                  <dd className="text-ink">{item.original}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">问题</dt>
                  <dd className="text-ink">{item.issues.join("；")}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">建议修改</dt>
                  <dd className="text-success">{item.corrected}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">解释</dt>
                  <dd className="text-ink">{item.explanation}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
