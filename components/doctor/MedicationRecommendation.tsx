import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp, Clock, Pill, History } from "lucide-react";

interface MedicationType {
  id: number;
  name: string;
  unit: string;
  groupname: string;
  dosage: number;
}

interface PreviousMedication {
  id: string;
  medicationtypeid: number;
  dosage: number;
  createdat: string;
  MedicationType: {
    id: number;
    name: string;
    unit: string;
    groupname: string;
  };
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
  disabled?: boolean;                    // NEW
  onSavingStart?: () => void;           // NEW
  onSavingEnd?: () => void;             // NEW
}

const MedicationRecommendation: React.FC<MedicationRecommendationProps> = ({ 
  labReportId, 
  testValues, 
  classification, 
  onSaved,
  disabled = false,                     // NEW
  onSavingStart,                       // NEW
  onSavingEnd                          // NEW
}) => {
  const [medications, setMedications] = useState<MedicationType[]>([]);
  const [previousMedications, setPreviousMedications] = useState<PreviousMedication[]>([]);
  const [closest, setClosest] = useState<ClosestReportInfo | null>(null);
  const [closestTestResults, setClosestTestResults] = useState<any>(null);
  const [closestMedications, setClosestMedications] = useState<PreviousMedication[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [previousReport, setPreviousReport] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      console.log("[MEDICATION_COMPONENT] Fetching data for labReportId:", labReportId);
      
      setLoading(true);
      setError(null);
      setFetchError(null);
      
      try {
        // Fetch closest patient data and medication types
        const closestResponse = await fetch("/api/doctor/patient/medication/closest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testValues })
        });
        
        const closestData = await closestResponse.json();
        console.log("[MEDICATION_COMPONENT] Closest data:", closestData);
        
        if (closestData.error) {
          setFetchError(closestData.error);
        } else {
          setMedications(closestData.medications || []);
          setClosest(closestData.closest || null);
          setClosestTestResults(closestData.testResults || null);
          setClosestMedications(closestData.closestMedications || []);
          
          // ADD THESE DEBUG LOGS
          console.log("[DEBUG] Closest medications data:", closestData.closestMedications);
          console.log("[DEBUG] Closest medications length:", closestData.closestMedications?.length);
          console.log("[DEBUG] Grouped closest medications:", closestMedications.reduce((acc: Record<string, PreviousMedication[]>, med) => {
            const groupname = med.MedicationType?.groupname || 'unknown';
            if (!acc[groupname]) acc[groupname] = [];
            acc[groupname].push(med);
            return acc;
          }, {} as Record<string, PreviousMedication[]>));
        }

        // Fetch patient's previous medications
        const previousResponse = await fetch("/api/doctor/patient/medication/previous", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentLabReportId: labReportId })
        });
        
        const previousData = await previousResponse.json();
        console.log("[MEDICATION_COMPONENT] Previous medications:", previousData);
        
        if (!previousData.error) {
          setPreviousMedications(previousData.medications || []);
          setPreviousReport(previousData.previousReport);
          
          // Initialize current medications with previous dosages or 0
          if (closestData.medications) {
            const initializedMedications = closestData.medications.map((med: MedicationType) => {
              const previousMed = previousData.medications?.find(
                (pm: PreviousMedication) => pm.medicationtypeid === med.id
              );
              return {
                ...med,
                dosage: previousMed ? previousMed.dosage : 0
              };
            });
            setMedications(initializedMedications);
          }
        }
        
      } catch (err) {
        console.error("[MEDICATION_COMPONENT] Fetch error:", err);
        setFetchError("Failed to load medication data");
      }
      
      setLoading(false);
    };

    fetchData();
  }, [labReportId, JSON.stringify(testValues)]);

  const handleDosageChange = (id: number, value: string) => {
    console.log("[MEDICATION_COMPONENT] Dosage changed for medication", id, "to", value);
    setMedications(meds => meds.map(m => m.id === id ? { ...m, dosage: Number(value) || 0 } : m));
  };

  const handleSave = async () => {
    console.log("[MEDICATION_COMPONENT] Saving medications for reportId:", labReportId);
    console.log("[MEDICATION_COMPONENT] Medications to save:", medications);
    
    setSaving(true);
    setError(null);
    
    // Notify parent that saving started
    if (onSavingStart) onSavingStart();
    
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
        setSuccess("Medications saved successfully");
        if (onSaved) onSaved();
      } else {
        console.error("[MEDICATION_COMPONENT] Save failed:", responseData);
        setError(responseData.error || "Failed to save medications");
      }
    } catch (err) {
      console.error("[MEDICATION_COMPONENT] Save error:", err);
      setError("Network error while saving medications");
    } finally {
      setSaving(false);
      // Notify parent that saving ended
      if (onSavingEnd) onSavingEnd();
    }
  };

  // Group medications by groupname
  const grouped = medications.reduce((acc, med) => {
    if (!acc[med.groupname]) acc[med.groupname] = [];
    acc[med.groupname].push(med);
    return acc;
  }, {} as Record<string, MedicationType[]>);

  // Group closest medications by groupname for display
  const groupedClosestMedications = closestMedications.reduce((acc, med) => {
    const groupname = med.MedicationType.groupname;
    if (!acc[groupname]) acc[groupname] = [];
    acc[groupname].push(med);
    return acc;
  }, {} as Record<string, PreviousMedication[]>);

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
          {/* Similar Patient Recommendations */}
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
                  Compare & View Recommendations
                  {showComparison ? (
                    <ChevronUp className="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </div>
              
              {showComparison && (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Test Values Comparison */}
                    {closestTestResults && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                          <Info className="w-4 h-4 mr-1" />
                          Test Values Comparison
                        </h4>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                            <div>Test</div>
                            <div>Similar Patient</div>
                            <div>Current Patient</div>
                          </div>
                          {Object.entries(testValues).map(([testName, currentValue]) => {
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
                    )}
                    
                    {/* Similar Patient Medications */}
                    {closestMedications.length > 0 && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                          <Pill className="w-4 h-4 mr-1" />
                          Recommended Medications (Similar Patient)
                        </h4>
                        <div className="space-y-3">
                          {Object.keys(groupedClosestMedications).map(group => (
                            <div key={group}>
                              <div className="text-xs font-medium text-purple-700 mb-2">{group}</div>
                              <div className="space-y-1">
                                {groupedClosestMedications[group].map(med => (
                                  <div key={med.id} className="flex items-center justify-between text-xs bg-purple-50 rounded p-2">
                                    <span className="text-gray-700">{med.MedicationType.name}</span>
                                    <span className="font-medium text-purple-700">
                                      {med.dosage} {med.MedicationType.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                    No similar patients found
                  </div>
                  <div className="text-xs text-blue-700">
                    No patients with similar test values found for medication recommendations.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Previous Medications Info */}
          {previousReport ? (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-indigo-800 mb-1">
                    Previous medications loaded
                  </div>
                  <div className="text-xs text-indigo-700">
                    Showing dosages from previous visit ({previousReport.reportdate?.slice(0,10)}). 
                    You can adjust them below.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-1">
                    First visit for this patient
                  </div>
                  <div className="text-xs text-gray-700">
                    No previous medications found. All dosages are set to 0 - please adjust as needed.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Current Prescription Form - MOBILE RESPONSIVE */}
          <div className="bg-gray-50 rounded-lg p-3 lg:p-4 border border-gray-200">
            <h4 className="text-sm lg:text-base font-medium text-gray-800 mb-3 flex items-center">
              <Pill className="w-4 h-4 mr-1" />
              Current Prescription
            </h4>
            
            {Object.keys(grouped).length > 0 ? Object.keys(grouped).map(group => (
              <div key={group} className="mb-4 lg:mb-6">
                <div className="font-semibold text-blue-700 mb-3 pb-1 border-b border-blue-200 text-sm lg:text-base">
                  {group}
                </div>
                <div className="space-y-2 lg:space-y-3">
                  {grouped[group].map(med => {
                    const previousMed = previousMedications.find(pm => pm.medicationtypeid === med.id);
                    return (
                      <div key={med.id} className="p-3 bg-white rounded border border-gray-200">
                        {/* MOBILE: Stack vertically, DESKTOP: Side by side */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-2 lg:space-y-0">
                          <div className="flex-1">
                            <span className="text-gray-800 font-medium text-sm lg:text-base leading-tight block">
                              {med.name}
                            </span>
                            {previousMed && (
                              <div className="text-xs text-gray-500 mt-1">
                                Previous: {previousMed.dosage} {med.unit}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 lg:space-x-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="border border-gray-300 rounded px-2 py-1 w-20 lg:w-24 text-center text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                              value={med.dosage}
                              onChange={e => handleDosageChange(med.id, e.target.value)}
                              placeholder="0"
                            />
                            <span className="text-gray-800 text-sm lg:text-base font-medium min-w-max">
                              {med.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm lg:text-base">No medication groups available</p>
              </div>
            )}
          </div>
          
          {/* Previous Medications Comparison - MOBILE RESPONSIVE */}
          {previousMedications.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 lg:p-4 border border-blue-200">
              <h4 className="text-sm lg:text-base font-medium text-blue-800 mb-3 flex items-center">
                <History className="w-4 h-4 mr-1" />
                Previous Medications (Last Visit)
              </h4>
              <div className="space-y-2">
                {previousMedications.filter(pm => pm.dosage > 0).map(prevMed => {
                  const currentMed = medications.find(m => m.id === prevMed.medicationtypeid);
                  const currentDosage = currentMed?.dosage || 0;
                  const previousDosage = prevMed.dosage;
                  const hasChanged = currentDosage !== previousDosage;
                  
                  return (
                    <div key={prevMed.id} className="bg-white p-2 lg:p-3 rounded border border-blue-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <span className="text-gray-800 font-medium text-xs lg:text-sm">
                          {prevMed.MedicationType.name}
                        </span>
                        <div className="flex items-center space-x-2 text-xs lg:text-sm">
                          <span className="text-gray-600">
                            Was: {previousDosage} {prevMed.MedicationType.unit}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`font-medium ${hasChanged ? 'text-blue-700' : 'text-gray-600'}`}>
                            Now: {currentDosage} {prevMed.MedicationType.unit}
                          </span>
                          {hasChanged && (
                            <span className="text-xs text-blue-600 font-medium bg-blue-100 px-1 rounded">
                              Modified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save Button and Status - MOBILE RESPONSIVE */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-4 lg:mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs lg:text-sm text-gray-600">
              {medications.filter(m => m.dosage > 0).length} medications prescribed
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={disabled || saving || medications.length === 0}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 lg:px-8 py-2 lg:py-3 rounded-lg disabled:bg-gray-400 font-medium text-sm lg:text-base"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : disabled ? (
                "Another save in progress..."
              ) : (
                <span className="flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  Save Medications
                </span>
              )}
            </Button>
          </div>

          {/* Success/Error Messages - MOBILE RESPONSIVE */}
          {(success || error) && (
            <div className="mt-4">
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
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MedicationRecommendation;
