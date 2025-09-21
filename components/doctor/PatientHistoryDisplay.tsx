import React, { useState, useEffect } from "react";
import { Calendar, FileText, TestTube, User, Activity, Edit3, Save, X, Trash2, AlertTriangle, Calculator, Pill } from "lucide-react";
import { Button } from "../ui/button";

// Update type definitions to match database column names
type TestResult = {
  id: string; // Changed to string to match UUID
  value: number;
  testdate: string; // lowercase
  testtypeid: number; // lowercase
  createdat?: string;
  lastmodified?: string;
  lastmodifiedby?: string;
  TestType: {
    id: number;
    code: string;
    name: string;
    unit: string;
  };
};

type Recommendation = {
  id: string; // Changed to string to match UUID
  questionid: number; // lowercase
  selectedoptionid: number; // lowercase
  Question: {
    id: number;
    text: string;
  };
  Option: {
    id: number;
    text: string;
  };
};

type Situation = {
  id: number;
  groupid: number;
  bucketid: number; // Make sure this is included
  code: string;
  description: string;
};

type Medication = {
  id: string;
  dosage: number;
  isoutdated: boolean;
  createdat: string;
  outdatedat?: string;
  outdatedreason?: string;
  outdatedby?: string;
  MedicationType: {
    id: number;
    name: string;
    unit: string;
    groupname: string;
  };
};

type VisitHistory = {
  id: string;
  visitDate: string;
  notes: string;
  situation: Situation | null;
  recommendations: Recommendation[];
  testResults: TestResult[];
  medications?: Medication[]; // NEW
  createdat?: string;
  lastmodified?: string;
  lastmodifiedby?: string;
  medicationStatus?: {
    hasOutdated: boolean;
    hasActive: boolean;
  };
};

interface PatientHistoryDisplayProps {
  visitHistory: VisitHistory;
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updatedTestResults: TestResult[]) => Promise<void>;
  onDelete: () => void;
}

// **FIX: Component must return JSX.Element, not void**
export default function PatientHistoryDisplay({
  visitHistory,
  isExpanded,
  isEditing,
  onToggle,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete
}: PatientHistoryDisplayProps): React.ReactElement {
  
  const [editedTestResults, setEditedTestResults] = useState<TestResult[]>(visitHistory.testResults);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatTestValue = (testResult: TestResult): string => {
    if (testResult.TestType.code === "Echo") {
      // Echo is boolean: 1 = true/positive, 0 = false/negative
      // Since it's a boolean field, there are only two possible values
      return testResult.value === 1 ? "Positive" : "Negative";
    }
    
    // For all other numeric test results
    return `${testResult.value} ${testResult.TestType.unit || ""}`.trim();
  };

  // Sort test results in the preferred order for display
  const sortedTestResults = [...(isEditing ? editedTestResults : visitHistory.testResults)].sort((a, b) => {
    const testOrder = ['PTH', 'Ca', 'Albumin', 'CaCorrected', 'Phos', 'Echo', 'LARad'];
    
    const aCode = a.TestType?.code || '';
    const bCode = b.TestType?.code || '';
    
    const aIndex = testOrder.indexOf(aCode);
    const bIndex = testOrder.indexOf(bCode);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return aCode.localeCompare(bCode);
  });

  // Calculate corrected calcium automatically
  const calculateCorrectedCalcium = (calcium: number, albumin: number): number => {
    return calcium + 0.8 * (4 - albumin);
  };

  // Update corrected calcium when Ca or Albumin changes
  const updateCorrectedCalcium = (updatedResults: TestResult[]): TestResult[] => {
    const caTest = updatedResults.find(test => test.TestType.code === 'Ca');
    const albuminTest = updatedResults.find(test => test.TestType.code === 'Albumin');
    const correctedCaTest = updatedResults.find(test => test.TestType.code === 'CaCorrected');

    if (caTest && albuminTest && correctedCaTest) {
      const correctedValue = calculateCorrectedCalcium(caTest.value, albuminTest.value);
      return updatedResults.map(test => 
        test.TestType.code === 'CaCorrected' 
          ? { ...test, value: parseFloat(correctedValue.toFixed(2)) }
          : test
      );
    }

    return updatedResults;
  };

  const handleTestValueChange = (testId: string, newValue: string) => {
    setEditedTestResults(prev => {
      const updated = prev.map(test => 
        test.id === testId 
          ? { ...test, value: parseFloat(newValue) || 0 }
          : test
      );
      
      // Auto-calculate corrected calcium if Ca or Albumin changed
      const changedTest = prev.find(test => test.id === testId);
      if (changedTest && (changedTest.TestType.code === 'Ca' || changedTest.TestType.code === 'Albumin')) {
        return updateCorrectedCalcium(updated);
      }
      return updated;
    });
  };

  // **FIX: Remove duplicate handleSave function and fix the structure**
  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await onSaveEdit(editedTestResults);
      
      // Note: The response handling for medication impact should be done in the parent component
      // since onSaveEdit is a Promise<void>, not Promise<response>
      
    } catch (error) {
      console.error('Error saving test results:', error);
      // Error handling can be added here if needed
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTestResults(visitHistory.testResults);
    onCancelEdit();
  };

  // Modified edit handler to automatically expand and show editing mode
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If visit is not expanded, expand it first then start editing
    if (!isExpanded) {
      onToggle(); // Expand the visit
      // Use setTimeout to ensure the expansion happens before editing starts
      setTimeout(() => {
        onEdit(); // Start editing mode
      }, 100);
    } else {
      // If already expanded, just start editing
      onEdit();
    }
  };

  // **FIX: Use consistent React import**
  useEffect(() => {
    setEditedTestResults(visitHistory.testResults);
  }, [visitHistory.testResults]);

  // Auto-calculate corrected calcium on initial load
  useEffect(() => {
    if (isEditing) {
      setEditedTestResults(prev => updateCorrectedCalcium(prev));
    }
  }, [isEditing]);

  return (
    <div className="border border-gray-200 rounded-lg mb-3 lg:mb-4 overflow-hidden bg-white/95 backdrop-blur-sm shadow-sm">
      {/* Header - FULLY MOBILE RESPONSIVE */}
      <div className="p-3 lg:p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-sm border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-0">
          <div 
            className="flex items-center space-x-2 lg:space-x-4 cursor-pointer flex-1 min-w-0"
            onClick={onToggle}
          >
            <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm lg:text-lg font-semibold text-gray-900 leading-tight">
                Visit: {new Date(visitHistory.visitDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric", 
                  year: "2-digit"
                })}
              </h3>
              
              {/* Mobile: Stack info vertically, Desktop: Horizontal */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 mt-1 lg:mt-1 space-y-1 lg:space-y-0">
                {/* Creation and modification info */}
                <div className="flex flex-wrap items-center gap-1 lg:gap-2 text-xs">
                  {visitHistory.createdat && (
                    <span className="bg-green-100/80 text-green-800 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-xs">
                      Created: {new Date(visitHistory.createdat).toLocaleDateString()}
                    </span>
                  )}
                  {visitHistory.lastmodified && (
                    <span className="bg-blue-100/80 text-blue-800 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-xs">
                      Modified: {new Date(visitHistory.lastmodified).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {/* Classification badges - CLINICAL INTERPRETATION */}
                {visitHistory.situation && (
                  <div className="flex flex-wrap items-center gap-1 lg:gap-2">
                    <span className="text-xs text-gray-600 hidden lg:inline">Classification:</span>
                    
                    {/* Vascular Classification based on groupid */}
                    <span className={`inline-flex items-center px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-xs font-medium ${
                      visitHistory.situation.groupid === 1 
                        ? 'bg-red-100/80 text-red-800' 
                        : 'bg-green-100/80 text-green-800'
                    }`}>
                      {visitHistory.situation.groupid === 1 ? 'Vascular (+ve)' : 'Vascular (-ve)'}
                    </span>
                    
                    {/* PTH Range based on bucketid */}
                    <span className={`inline-flex items-center px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-xs font-medium ${
                      visitHistory.situation.bucketid === 1 || visitHistory.situation.bucketid === 3
                        ? 'bg-orange-100/80 text-orange-800' 
                        : 'bg-blue-100/80 text-blue-800'
                    }`}>
                      PTH: {
                        visitHistory.situation.bucketid === 1 ? 'High-turnover' :
                        visitHistory.situation.bucketid === 2 ? 'Within-range' :
                        visitHistory.situation.bucketid === 3 ? 'Low-turnover' :
                        'Unknown'
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons - FULLY MOBILE RESPONSIVE */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 lg:gap-2">
            {/* Action Buttons */}
            {!isEditing && (
              <>
                <Button
                  onClick={handleEditClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base flex items-center justify-center"
                >
                  <Edit3 className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Edit</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  disabled={deleteLoading === visitHistory.id}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 text-sm lg:text-base flex items-center justify-center"
                >
                  {deleteLoading === visitHistory.id ? (
                    <>
                      <div className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 lg:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Deleting...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Delete</span>
                      <span className="sm:hidden">Del</span>
                    </>
                  )}
                </Button>
              </>
            )}
            
            {isEditing && (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  disabled={saveLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base flex items-center justify-center"
                >
                  {saveLoading ? (
                    <>
                      <div className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 lg:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Save</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base flex items-center justify-center"
                >
                  <X className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Cancel</span>
                  <span className="sm:hidden">Cancel</span>
                </Button>
              </>
            )}
            
            {/* Recommendations count and expand indicator */}
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs lg:text-sm text-gray-500 bg-white/80 px-2 py-1 rounded">
              <span className="sm:hidden">
                {visitHistory.recommendations.length} rec(s)
              </span>
              <span className="hidden sm:inline">
                {visitHistory.recommendations.length} recommendation(s)
              </span>
              <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </div>
          </div>
        </div>
        
        {/* Edit Mode Warning - MOBILE RESPONSIVE */}
        {isEditing && (
          <div className="mt-2 lg:mt-3 p-2 lg:p-3 bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-3 h-3 lg:w-4 lg:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs lg:text-sm font-medium text-amber-800 leading-tight">
                Edit Mode: Modify test values below. Corrected Calcium will be auto-calculated.
              </span>
            </div>
          </div>
        )}

        {/* Medication Status - MOBILE RESPONSIVE */}
        {visitHistory.medicationStatus && (
          <div className="mt-2">
            {visitHistory.medicationStatus.hasOutdated ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100/80 text-amber-800">
                ⚠️ <span className="hidden sm:inline ml-1">Medications Need Review</span>
                <span className="sm:hidden ml-1">Med Review</span>
              </span>
            ) : visitHistory.medicationStatus.hasActive ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100/80 text-green-800">
                ✅ <span className="hidden sm:inline ml-1">Active Medications</span>
                <span className="sm:hidden ml-1">Active Meds</span>
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Expanded Content - FULLY MOBILE RESPONSIVE */}
      {isExpanded && (
        <div className="p-3 lg:p-6 space-y-4 lg:space-y-6 bg-white/95 backdrop-blur-sm">
          {/* Test Results Section - MOBILE RESPONSIVE */}
          {sortedTestResults.length > 0 && (
            <div>
              <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center">
                <TestTube className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2 text-green-600 flex-shrink-0" />
                <span className="hidden sm:inline">Laboratory Test Results</span>
                <span className="sm:hidden">Lab Results</span>
                {isEditing && (
                  <span className="ml-2 text-xs lg:text-sm font-normal text-amber-600">(Editing)</span>
                )}
              </h4>
              
              {/* Mobile: Single column, Tablet: 2 columns, Desktop: 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {sortedTestResults.map((test) => (
                  <div key={test.id} className={`rounded-lg p-3 lg:p-4 border backdrop-blur-sm ${
                    isEditing ? 'border-blue-400 bg-blue-50/90 shadow-md' : 'border-gray-200 bg-gray-50/90'
                  }`}>
                    <div className="space-y-2 lg:space-y-3">
                      <div>
                        <h5 className={`font-medium text-sm lg:text-base ${isEditing ? 'text-blue-900' : 'text-gray-900'}`}>
                          {test.TestType.name}
                        </h5>
                        <p className={`text-xs lg:text-sm ${isEditing ? 'text-blue-700' : 'text-gray-600'}`}>
                          {test.TestType.code}
                        </p>
                      </div>
                      
                      {/* Test Value - MOBILE RESPONSIVE */}
                      <div>
                        <label className={`text-xs font-medium ${
                          isEditing ? 'text-blue-800' : 'text-gray-700'
                        }`}>
                          Value:
                        </label>
                        {isEditing ? (
                          // Special handling for different test types
                          test.TestType.code === "Echo" ? (
                            <select
                              value={test.value}
                              onChange={(e) => handleTestValueChange(test.id, e.target.value)}
                              className="w-full mt-1 p-2 lg:p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/95 backdrop-blur-sm text-gray-900 font-medium text-sm lg:text-base"
                            >
                              <option value={0}>Negative</option>
                              <option value={1}>Positive</option>
                            </select>
                          ) : test.TestType.code === "CaCorrected" ? (
                            // Corrected Calcium - Read Only with explanation
                            <div className="space-y-1 lg:space-y-2">
                              <input
                                type="number"
                                step="0.01"
                                value={test.value.toFixed(2)}
                                readOnly
                                className="w-full mt-1 p-2 lg:p-3 border-2 border-gray-300 rounded-lg bg-gray-100/90 backdrop-blur-sm text-gray-700 font-medium text-sm lg:text-lg cursor-not-allowed"
                              />
                              <p className="text-xs text-blue-600 font-medium leading-tight bg-blue-50/80 p-1 rounded">
                                💡 Auto-updates when Ca/Albumin changes
                              </p>
                            </div>
                          ) : (
                            // Regular numeric inputs
                            <input
                              type="number"
                              step="0.01"
                              value={test.value}
                              onChange={(e) => handleTestValueChange(test.id, e.target.value)}
                              className="w-full mt-1 p-2 lg:p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/95 backdrop-blur-sm text-gray-900 font-medium text-sm lg:text-lg"
                            />
                          )
                        ) : (
                          <p className="font-bold text-sm lg:text-lg text-blue-600 mt-1">
                            {formatTestValue(test)}
                          </p>
                        )}
                      </div>
                      
                      {/* Test Date - Only show in VIEW mode, hide in EDIT mode */}
                      {!isEditing && (
                        <div>
                          <label className="text-xs font-medium text-gray-700">
                            {test.lastmodified ? 'Modified:' : 'Test Date:'}
                          </label>
                          <p className="text-xs lg:text-sm text-gray-600 mt-1 leading-tight">
                            {test.lastmodified 
                              ? new Date(test.lastmodified).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : new Date(test.testdate).toLocaleDateString('en-US', {
                                  month: 'short', 
                                  day: 'numeric'
                                })
                            }
                          </p>
                          {test.lastmodified && test.lastmodifiedby && (
                            <p className="text-xs text-gray-500 mt-1 leading-tight">
                              By: {test.lastmodifiedby}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Show current date info in edit mode */}
                      {isEditing && test.TestType.code !== "CaCorrected" && (
                        <div className="text-xs text-blue-600 bg-blue-50/80 backdrop-blur-sm p-1.5 lg:p-2 rounded">
                          <span className="font-medium">Original:</span> {new Date(test.testdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {test.lastmodified && (
                            <>
                              <br />
                              <span className="font-medium">Modified:</span> {new Date(test.lastmodified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </>
                          )}
                          <br />
                          <span className="text-blue-500">Note: Values only</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classification Details - MOBILE RESPONSIVE */}
          {visitHistory.situation && (
            <div>
              <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center">
                <Activity className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2 text-purple-600 flex-shrink-0" />
                <span className="hidden sm:inline">Clinical Classification</span>
                <span className="sm:hidden">Classification</span>
              </h4>
              <div className="bg-gradient-to-r from-purple-50/90 to-indigo-50/90 backdrop-blur-sm rounded-lg p-3 lg:p-4 border border-purple-200">
                <div className="grid grid-cols-3 gap-2 lg:gap-4">
                  <div className="text-center">
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Group</p>
                    <p className="text-lg lg:text-2xl font-bold text-blue-600">{visitHistory.situation.groupid}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Bucket</p>
                    <p className="text-lg lg:text-2xl font-bold text-green-600">{visitHistory.situation.bucketid}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Situation</p>
                    <p className="text-lg lg:text-2xl font-bold text-amber-600">{visitHistory.situation.code}</p>
                  </div>
                </div>
                <div className="mt-2 lg:mt-4">
                  <p className="text-xs lg:text-sm text-gray-700 leading-tight">
                    <span className="font-medium">Description:</span> {visitHistory.situation.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Section - MOBILE RESPONSIVE */}
          <div>
            <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center">
              <FileText className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2 text-orange-600 flex-shrink-0" />
              <span className="hidden sm:inline">Treatment Recommendations</span>
              <span className="sm:hidden">Recommendations</span>
            </h4>
            {visitHistory.recommendations.length > 0 ? (
              <div className="space-y-2 lg:space-y-3">
                {visitHistory.recommendations.map((rec) => (
                  <div key={rec.id} className="bg-orange-50/90 backdrop-blur-sm rounded-lg p-3 lg:p-4 border border-orange-200">
                    <div className="space-y-1 lg:space-y-2">
                      <p className="text-xs lg:text-sm font-medium text-gray-800 leading-tight">
                        <span className="text-orange-600">Q:</span> {rec.Question.text}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-700 ml-3 lg:ml-4 leading-tight">
                        <span className="font-medium text-orange-600">A:</span> {rec.Option.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic text-sm">No recommendations recorded.</p>
            )}
          </div>

          {/* MEDICATIONS SECTION - MOBILE RESPONSIVE */}
          <div>
            <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center">
              <Pill className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2 text-purple-600" />
              <span className="hidden sm:inline">Medication Prescriptions</span>
              <span className="sm:hidden">Medications</span>
            </h4>
            {visitHistory.medications && visitHistory.medications.length > 0 ? (
              <div className="space-y-3 lg:space-y-4">
                {/* Active Medications */}
                {visitHistory.medications.filter(med => !med.isoutdated).length > 0 && (
                  <div>
                    <h5 className="text-sm lg:text-md font-medium text-green-800 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <span className="hidden sm:inline">Active Medications</span>
                      <span className="sm:hidden">Active Meds</span>
                    </h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                      {visitHistory.medications
                        .filter(med => !med.isoutdated)
                        .map((med) => (
                          <div key={med.id} className="bg-green-50 rounded-lg p-3 lg:p-4 border border-green-200">
                            <div className="space-y-1 lg:space-y-2">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                                <div className="min-w-0 flex-1">
                                  <h6 className="font-medium text-gray-900 text-sm lg:text-base leading-tight">
                                    {med.MedicationType.name}
                                  </h6>
                                  <p className="text-xs lg:text-sm text-green-700 font-medium">
                                    {med.MedicationType.groupname}
                                  </p>
                                </div>
                                <span className="text-base lg:text-lg font-bold text-green-700 flex-shrink-0">
                                  {med.dosage} {med.MedicationType.unit}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                Prescribed: {new Date(med.createdat).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Outdated Medications */}
                {visitHistory.medications.filter(med => med.isoutdated).length > 0 && (
                  <div>
                    <h5 className="text-sm lg:text-md font-medium text-amber-800 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                      <span className="hidden sm:inline">Outdated Medications (Need Review)</span>
                      <span className="sm:hidden">Outdated Meds</span>
                    </h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                      {visitHistory.medications
                        .filter(med => med.isoutdated)
                        .map((med) => (
                          <div key={med.id} className="bg-amber-50 rounded-lg p-3 lg:p-4 border border-amber-200">
                            <div className="space-y-1 lg:space-y-2">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                                <div className="min-w-0 flex-1">
                                  <h6 className="font-medium text-gray-900 text-sm lg:text-base leading-tight">
                                    {med.MedicationType.name}
                                  </h6>
                                  <p className="text-xs lg:text-sm text-amber-700 font-medium">
                                    {med.MedicationType.groupname}
                                  </p>
                                </div>
                                <span className="text-base lg:text-lg font-bold text-amber-700 flex-shrink-0">
                                  {med.dosage} {med.MedicationType.unit}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>Prescribed: {new Date(med.createdat).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                {med.outdatedat && (
                                  <div className="text-amber-600">
                                    Outdated: {new Date(med.outdatedat).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                                {med.outdatedreason && (
                                  <div className="text-amber-700 font-medium leading-tight">
                                    Reason: {med.outdatedreason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 lg:py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Pill className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs lg:text-sm">No medications prescribed</p>
              </div>
            )}
          </div>

          {/* Clinical Notes - MOBILE RESPONSIVE */}
          {visitHistory.notes && (
            <div>
              <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center">
                <FileText className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2 text-gray-600" />
                <span className="hidden sm:inline">Clinical Notes</span>
                <span className="sm:hidden">Notes</span>
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 lg:p-4 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap text-sm lg:text-base leading-relaxed">
                  {visitHistory.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
