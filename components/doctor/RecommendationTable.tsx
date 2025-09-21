import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

type Option = { id: number; text: string };
type Question = {
  questionId: number;
  questionText: string;
  options: Option[];
  defaultOptionId: number;
  defaultOptionText: string;
};

export default function RecommendationTable({
  situationId,
  labReportId,
  onRecommendationsSaved,
  disabled = false,
  onSavingStart,
  onSavingEnd,
}: {
  situationId: number;
  labReportId: string;
  onRecommendationsSaved?: (recommendations: any[]) => void;
  disabled?: boolean;
  onSavingStart?: () => void;
  onSavingEnd?: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!situationId) return;
    setLoading(true);
    fetch(`/api/doctor/recommendation?situationId=${situationId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.recommendations || []);
        const defaults: Record<number, number> = {};
        (data.recommendations || []).forEach((q: Question) => {
          defaults[q.questionId] = q.defaultOptionId;
        });
        setAnswers(defaults);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load recommendations");
        setLoading(false);
      });
  }, [situationId]);

  const handleChange = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (onSavingStart) onSavingStart();

    try {
      const recommendations = Object.entries(answers).map(
        ([questionId, selectedOptionId]) => ({
          questionId: Number(questionId),
          selectedOptionId,
        })
      );

      const res = await fetch("/api/doctor/assign-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labReportId,
          recommendations,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save recommendations");
      }

      setSuccess(
        "Recommendations saved successfully! You can now proceed to medications or complete the visit."
      );

      if (onRecommendationsSaved) {
        const savedRecommendations = questions.map((q) => ({
          questionId: q.questionId,
          questionText: q.questionText,
          selectedOptionId: answers[q.questionId],
          selectedOptionText:
            q.options.find((opt) => opt.id === answers[q.questionId])?.text || "",
        }));
        onRecommendationsSaved(savedRecommendations);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save recommendations"
      );
    } finally {
      setLoading(false);
      if (onSavingEnd) onSavingEnd();
    }
  };

  if (!situationId) return null;
  if (loading && questions.length === 0)
    return <div className="text-center py-8">Loading recommendations...</div>;
  if (error)
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>
    );

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-rose-50 rounded-xl shadow p-4 lg:p-6 border border-blue-100">
      <h3 className="text-lg lg:text-xl font-bold text-blue-900 mb-4 lg:mb-6">
        Treatment Recommendations
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-4 lg:space-y-6"
      >
        {questions.map((q) => (
          <div key={q.questionId} className="space-y-3">
            <label className="block text-gray-800 font-medium text-sm lg:text-base leading-relaxed">
              {q.questionText}
            </label>

            {/* Mobile: Stack options vertically */}
            <div className="flex flex-col lg:flex-row lg:flex-wrap gap-2 lg:gap-3">
              {q.options.map((opt) => (
                <label
                  key={opt.id}
                  className={`px-3 lg:px-4 py-2 lg:py-3 rounded-lg border cursor-pointer transition text-sm lg:text-base
                    ${
                      answers[q.questionId] === opt.id
                        ? "bg-green-500 text-black border-green-600 shadow-md"
                        : opt.id === q.defaultOptionId
                        ? "bg-yellow-300 text-black border-yellow-400"
                        : "bg-white text-black border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                    }`}
                >
                  <input
                    type="radio"
                    name={`q_${q.questionId}`}
                    value={opt.id}
                    checked={answers[q.questionId] === opt.id}
                    onChange={() => handleChange(q.questionId, opt.id)}
                    className="hidden"
                  />
                  <span className="block leading-tight">{opt.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {success && (
          <div className="p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm lg:text-base">{success}</p>
          </div>
        )}

        {error && (
          <div className="p-3 lg:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm lg:text-base">{error}</p>
          </div>
        )}

        <div className="flex justify-center lg:justify-end pt-4">
          <Button
            type="submit"
            className="w-full lg:w-auto bg-rose-600 hover:bg-rose-700 text-white px-6 lg:px-8 py-2 lg:py-3 rounded-lg disabled:bg-gray-400 text-sm lg:text-base"
            disabled={disabled || loading}
          >
            {loading
              ? "Saving..."
              : disabled
              ? "Another save in progress..."
              : "Save Recommendations"}
          </Button>
        </div>
      </form>
    </div>
  );
}
