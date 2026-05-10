import { ClipboardCheck } from "lucide-react";

import { ExpressionUpgrades } from "@/components/expression-upgrades";
import { MajorProblems } from "@/components/major-problems";
import { NextPractice } from "@/components/next-practice";
import { RelevanceAnalysis } from "@/components/relevance-analysis";
import { RevisedEssay } from "@/components/revised-essay";
import { ScoreCard } from "@/components/score-card";
import { SentenceCorrections } from "@/components/sentence-corrections";
import type { EssayReview } from "@/lib/review-schema";

type ReviewReportProps = {
  review: EssayReview | null;
};

export function ReviewReport({ review }: ReviewReportProps) {
  if (!review) {
    return (
      <section className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-line bg-white p-6 text-center shadow-panel">
        <div>
          <ClipboardCheck className="mx-auto h-9 w-9 text-muted" />
          <h2 className="mt-3 text-base font-semibold text-ink">
            批改报告会显示在这里
          </h2>
          <p className="mt-2 text-sm text-muted">
            填入题目和作文后，点击开始批改。
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <ScoreCard score={review.score} />
      <MajorProblems problems={review.majorProblems} />
      <RelevanceAnalysis relevance={review.relevance} />
      <SentenceCorrections corrections={review.sentenceCorrections} />
      <ExpressionUpgrades upgrades={review.expressionUpgrades} />
      <RevisedEssay revisedEssay={review.revisedEssay} />
      <NextPractice nextPractice={review.nextPractice} />
    </div>
  );
}
