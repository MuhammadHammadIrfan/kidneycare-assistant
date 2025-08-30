import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

interface MedicationType {
  id: number;
  name: string;
  unit: string;
  groupname: string;
  dosage: number;
}

interface ClosestReportInfo {
  id: string;
  patientId: string;
  reportDate: string;
}

interface MedicationRecommendationProps {
  labReportId: string;
  testValues: any;
  classification: { group: number; bucket: number };
  onSaved?: () => void;
}

const MedicationRecommendation: React.FC<MedicationRecommendationProps> = ({ labReportId, testValues, classification, onSaved }) => {
  const [medications, setMedications] = useState<MedicationType[]>([]);
  const [closest, setClosest] = useState<ClosestReportInfo | null>(null);
  const [closestTestResults, setClosestTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  useEffect(() => {
    console.log("[MEDICATION_COMPONENT] Fetching medications for testValues:", testValues);
    console.log("[MEDICATION_COMPONENT] LabReportId:", labReportId);
    
    setLoading(true);
    setError(null);
    setFetchError(null);
    
    fetch("/api/doctor/patient/medication/closest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testValues })
    })
      .then(res => {
        console.log("[MEDICATION_COMPONENT] API response status:", res.status);
        return res.json();
      })
      .then(data => {
        console.log("[MEDICATION_COMPONENT] API response data:", data);
        
        if (data.error) {
          setFetchError(data.error);
          setLoading(false);
          return;
        }
        
        setMedications(data.medications || []);
        setClosest(data.closest || null);
        setClosestTestResults(data.testResults || null);
        
        // Only show error if API didn't return medications array at all
        // If medications array is empty, that's still valid (means MedicationType table is empty)
        if (!Array.isArray(data.medications)) {
          setFetchError("Invalid response format from server");
        }
        
        setLoading(false);
      })
      .catch(err => {
        console.error("[MEDICATION_COMPONENT] API error:", err);
        setFetchError("Failed to load medication recommendations");
        setLoading(false);
      });
  }, [JSON.stringify(testValues)]);

  const handleDosageChange = (id: number, value: string) => {
    console.log("[MEDICATION_COMPONENT] Dosage changed for medication", id, "to", value);
    setMedications(meds => meds.map(m => m.id === id ? { ...m, dosage: Number(value) || 0 } : m));
  };

  const handleSave = async () => {
    console.log("[MEDICATION_COMPONENT] Saving medications for reportId:", labReportId);
    console.log("[MEDICATION_COMPONENT] Medications to save:", medications);
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch("/api/doctor/patient/medication/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: labReportId, medications })
      });
      
      const responseData = await res.json();
      console.log("[MEDICATION_COMPONENT] Save response:", responseData);
      
      if (res.ok) {
        console.log("[MEDICATION_COMPONENT] Save successful");
        if (onSaved) onSaved();
      } else {
        console.error("[MEDICATION_COMPONENT] Save failed:", responseData);
        setError(responseData.error || "Failed to save medications");
      }
    } catch (err) {
      console.error("[MEDICATION_COMPONENT] Save error:", err);
      setError("Network error while saving medications");
    }
    
    setSaving(false);
  };

  // Group medications by groupname
  const grouped = medications.reduce((acc, med) => {
    if (!acc[med.groupname]) acc[med.groupname] = [];
    acc[med.groupname].push(med);
    return acc;
  }, {} as Record<string, MedicationType[]>);

  return (
    <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100 mt-6">
      <h3 className="text-lg font-semibold text-blue-800 mb-4">Medication Recommendations</h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading medication recommendations...</span>
        </div>
      ) : fetchError ? (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Unable to load medications</p>
            <p className="text-red-600 text-sm">{fetchError}</p>
          </div>
        </div>
      ) : medications.length === 0 ? (
        <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Info className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" />
          <div>
            <p className="text-amber-800 font-medium">No medication types configured</p>
            <p className="text-amber-600 text-sm">The system doesn't have any medication types configured. Please contact your administrator to set up the medication database.</p>
          </div>
        </div>
      ) : (
        <>
          {closest ? (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-green-800 mb-1">
                      Found similar patient with medications
                    </div>
                    <div className="text-xs text-green-700">
                      Report Date: {closest.reportDate?.slice(0,10)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="flex items-center text-green-700 hover:text-green-800 text-sm font-medium"
                >
                  Compare Test Values
                  {showComparison ? (
                    <ChevronUp className="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </div>
              
              {showComparison && closestTestResults && (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Test Values Comparison</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                        <div>Test</div>
                        <div>Similar Patient</div>
                        <div>Current Patient</div>
                      </div>
                      {Object.entries(testValues).map(([testName, currentValue]) => {
                        // Now closestTestResults is an object with test codes as keys
                        const similarValue = closestTestResults[testName];
                        
                        return (
                          <div key={testName} className="grid grid-cols-3 gap-2 text-xs py-1">
                            <div className="font-medium text-gray-700">{testName}</div>
                            <div className="text-blue-600 font-medium">
                              {similarValue !== undefined 
                                ? (typeof similarValue === 'boolean' ? (similarValue ? 'Yes' : 'No') : String(similarValue))
                                : 'N/A'
                              }
                            </div>
                            <div className="text-gray-800 font-medium">
                              {typeof currentValue === 'boolean' ? (currentValue ? 'Yes' : 'No') : String(currentValue)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-blue-800 mb-1">
                    No previous medications found
                  </div>
                  <div className="text-xs text-blue-700">
                    This appears to be the first medication prescription. All dosages are set to 0 - please adjust as needed.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {Object.keys(grouped).length > 0 ? Object.keys(grouped).map(group => (
            <div key={group} className="mb-6">
              <div className="font-semibold text-blue-700 mb-3 pb-1 border-b border-blue-200">{group}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped[group].map(med => (
                  <div key={med.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    <span className="flex-1 text-gray-800 font-medium">{med.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-center text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={med.dosage}
                      onChange={e => handleDosageChange(med.id, e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-gray-800 text-sm font-medium min-w-0 flex-shrink-0">{med.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="text-center py-4 text-gray-500">
              <p>No medication groups available</p>
            </div>
          )}
          
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <Button 
              onClick={handleSave} 
              disabled={saving || medications.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save Medications"}
            </Button>
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MedicationRecommendation;
