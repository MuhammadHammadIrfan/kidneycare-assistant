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
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Initial Test Results</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TESTS.map((test) => (
          <div key={test.code}>
            <label className="block text-gray-700 mb-1 font-medium">{test.name}</label>
            {test.type === "boolean" ? (
                <select
                    name={test.code}
                    value={testValues[test.code] ?? ""}
                    onChange={(e) => onChange(e)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-black">
                    <option value="">Select</option>
                    <option value="1">True</option>
                    <option value="0">False</option>
                </select>
            ) : test.type === "readonly" ? (
              <input
                type="text"
                name={test.code}
                value={testValues[test.code] || ""}
                readOnly
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-black"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-black"
                placeholder={`Enter ${test.name}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
