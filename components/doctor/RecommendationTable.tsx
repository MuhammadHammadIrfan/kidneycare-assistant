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
}: {
  situationId: number;
  labReportId: string;
  onRecommendationsSaved?: (recommendations: any[]) => void;
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
        // Log default options
        (data.recommendations || []).forEach((q: Question) => {
            console.log(
            `Question ID: ${q.questionId}, Default Option ID: ${q.defaultOptionId}, Options:`,
            q.options
            );
        });
        // Set default answers
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
    
    try {
      // Convert answers to the format expected by the API
      const recommendations = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId: Number(questionId),
        selectedOptionId,
      }));

      console.log('Sending recommendations:', { labReportId, recommendations });

      const res = await fetch("/api/doctor/assign-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labReportId,
          recommendations, // ← Changed from 'answers' to 'recommendations'
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to save recommendations");
      }
      
      setSuccess("Recommendations saved!");
      
      // Prepare recommendations data for the report
      const savedRecommendations = questions.map((q) => ({
        questionText: q.questionText,
        selectedOptionText: q.options.find(opt => opt.id === answers[q.questionId])?.text || "Not selected"
      }));
      
      // Call the callback if provided
      if (onRecommendationsSaved) {
        onRecommendationsSaved(savedRecommendations);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recommendations");
    } finally {
      setLoading(false);
    }
  };

  if (!situationId) return null;
  if (loading && questions.length === 0) return <div>Loading recommendations...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="mt-10 bg-gradient-to-br from-blue-50 via-white to-rose-50 rounded-xl shadow p-6 border border-blue-100">
      <h3 className="text-xl font-bold text-blue-900 mb-4">Treatment Recommendations</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-6"
      >
        {questions.map((q) => (
          <div key={q.questionId} className="mb-4">
            <label className="block text-gray-800 font-medium mb-2">{q.questionText}</label>
            <div className="flex flex-wrap gap-3">
              {q.options.map((opt) => (
                <label
                  key={opt.id}
                  className={`px-4 py-2 rounded-lg border cursor-pointer transition
                    ${
                        answers[q.questionId] === opt.id
                        ? "bg-green-500 text-black border-green-600" // Selected by doctor
                        : opt.id === q.defaultOptionId
                            ? "bg-yellow-300 text-black border-yellow-400" // Default option
                            : "bg-white text-black border-gray-300 hover:bg-blue-50" // Normal
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
                  {opt.text}
                </label>
              ))}
            </div>
          </div>
        ))}
        {success && <div className="text-green-600">{success}</div>}
        {error && <div className="text-red-600">{error}</div>}
        <Button
          type="submit"
          className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-2 rounded-lg mt-4"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Recommendations"}
        </Button>
      </form>
    </div>
  );
}
