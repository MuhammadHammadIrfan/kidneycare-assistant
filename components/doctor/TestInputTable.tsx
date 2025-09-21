const TESTS = [
  { code: "PTH", name: "PTH (pg/mL)", type: "number", min: 0, max: 2000, step: 1 },
  { code: "Ca", name: "Calcium (mg/dL)", type: "number", min: 0, max: 20, step: 0.1 },
  { code: "Albumin", name: "Albumin (g/dL)", type: "number", min: 0, max: 10, step: 0.1 },
  { code: "CaCorrected", name: "Corrected Calcium (mg/dL)", type: "readonly" },
  { code: "Phos", name: "Phosphate (mg/dL)", type: "number", min: 0, max: 20, step: 0.1 },
  { code: "Echo", name: "Echocardiogram", type: "boolean" },
  { code: "LARad", name: "Lateral Abdominal Radiography", type: "number", min: 0, max: 20, step: 0.1 },
];

export default function TestInputTable({
  testValues,
  onChange,
}: {
  testValues: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) {
  // Calculate corrected calcium
  const calcium = parseFloat(testValues.Ca || "0");
  const albumin = parseFloat(testValues.Albumin || "0");
  const correctedCa = calcium + 0.8 * (4 - albumin);

  // Inject corrected value into testValues so it is also sent to DB
  testValues.CaCorrected = correctedCa.toFixed(2);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {TESTS.map((test) => (
          <div key={test.code} className="space-y-2">
            <label className="block text-gray-700 font-medium text-sm lg:text-base">
              {test.name}
              {test.type !== "readonly" && test.type !== "boolean" && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            {test.type === "boolean" ? (
              <select
                name={test.code}
                value={testValues[test.code] ?? ""}
                onChange={(e) => onChange(e)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 lg:py-3 text-black bg-white text-sm lg:text-base h-10 lg:h-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="1">Positive</option>
                <option value="0">Negative</option>
              </select>
            ) : test.type === "readonly" ? (
              <input
                type="text"
                name={test.code}
                value={testValues[test.code] || ""}
                readOnly
                className="w-full border border-gray-300 rounded-md px-3 py-2 lg:py-3 bg-gray-100 text-black text-sm lg:text-base h-10 lg:h-12"
                placeholder="Auto-calculated"
              />
            ) : (
              <input
                type={test.type}
                name={test.code}
                value={testValues[test.code] || ""}
                onChange={onChange}
                step={test.step}
                min={test.min}
                max={test.max}
                className="w-full border border-gray-300 rounded-md px-3 py-2 lg:py-3 text-black text-sm lg:text-base h-10 lg:h-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Enter ${test.name.split('(')[0].trim()}`}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Info note for mobile */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg lg:hidden">
        <p className="text-xs text-blue-700">
          💡 Corrected Calcium is automatically calculated based on Calcium and Albumin values.
        </p>
      </div>
    </div>
  );
}
