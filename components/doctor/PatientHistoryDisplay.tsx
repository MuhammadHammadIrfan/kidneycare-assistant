import React, { useState, useEffect } from "react";
import { Calendar, FileText, TestTube, User, Activity, Edit3, Save, X, Trash2, AlertTriangle, Calculator } from "lucide-react";
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

type VisitHistory = {
  id: string;
  visitDate: string;
  notes: string;
  situation: Situation | null;
  recommendations: Recommendation[];
  testResults: TestResult[];
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
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null); // Track delete loading state

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
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden bg-white shadow-sm">
      {/* Header - Always Visible */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div 
            className="flex items-center space-x-4 cursor-pointer flex-1"
            onClick={onToggle}
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Visit Date: {formatDate(visitHistory.visitDate)}
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                {/* Creation and modification info */}
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {visitHistory.createdat && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                      Created: {new Date(visitHistory.createdat).toLocaleDateString()}
                    </span>
                  )}
                  {visitHistory.lastmodified && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Modified: {new Date(visitHistory.lastmodified).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {visitHistory.situation && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Classification:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Group {visitHistory.situation.groupid}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Bucket {visitHistory.situation.bucketid}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {visitHistory.situation.code}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Action Buttons */}
            {!isEditing && (
              <>
                <Button
                  onClick={handleEditClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white !px-6 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  disabled={deleteLoading === visitHistory.id}
                  className="bg-red-600 hover:bg-red-700 text-white !px-6 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {deleteLoading === visitHistory.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
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
                  className="bg-green-600 hover:bg-green-700 text-white !px-6 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {saveLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white !px-6 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            
            <span className="text-sm text-gray-500">
              {visitHistory.recommendations.length} recommendation(s)
            </span>
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </div>
        </div>
        
        {/* Edit Mode Warning */}
        {isEditing && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Edit Mode: Modify test values below. Corrected Calcium will be auto-calculated based on Calcium and Albumin values.
              </span>
            </div>
          </div>
        )}

        {/* Medication Status - Always Visible */}
        {visitHistory.medicationStatus && (
          <div className="mt-2">
            {visitHistory.medicationStatus.hasOutdated ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                ⚠️ Medications Need Review
              </span>
            ) : visitHistory.medicationStatus.hasActive ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✅ Active Medications
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Test Results Section */}
          {sortedTestResults.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <TestTube className="w-5 h-5 mr-2 text-green-600" />
                Laboratory Test Results
                {isEditing && (
                  <span className="ml-2 text-sm font-normal text-amber-600">(Editing Mode)</span>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedTestResults.map((test) => (
                  <div key={test.id} className={`rounded-lg p-4 border ${
                    isEditing ? 'border-blue-400 bg-blue-100 shadow-md' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="space-y-3">
                      <div>
                        <h5 className={`font-medium ${isEditing ? 'text-blue-900' : 'text-gray-900'}`}>
                          {test.TestType.name}
                        </h5>
                        <p className={`text-sm ${isEditing ? 'text-blue-700' : 'text-gray-600'}`}>
                          {test.TestType.code}
                        </p>
                      </div>
                      
                      {/* Test Value */}
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
                              className="w-full mt-1 p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
                            >
                              <option value={0}>Negative</option>
                              <option value={1}>Positive</option>
                            </select>
                          ) : test.TestType.code === "CaCorrected" ? (
                            // Corrected Calcium - Read Only with explanation
                            <div className="space-y-2">
                              <input
                                type="number"
                                step="0.01"
                                value={test.value.toFixed(2)}
                                readOnly
                                className="w-full mt-1 p-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-medium text-lg cursor-not-allowed"
                              />
                              <p className="text-xs text-blue-600 font-medium">
                                💡 This value updates automatically when you change Calcium or Albumin
                              </p>
                            </div>
                          ) : (
                            // Regular numeric inputs
                            <input
                              type="number"
                              step="0.01"
                              value={test.value}
                              onChange={(e) => handleTestValueChange(test.id, e.target.value)}
                              className="w-full mt-1 p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium text-lg"
                            />
                          )
                        ) : (
                          <p className="font-bold text-lg text-blue-600 mt-1">
                            {formatTestValue(test)}
                          </p>
                        )}
                      </div>
                      
                      {/* Test Date - Only show in VIEW mode, hide in EDIT mode */}
                      {!isEditing && (
                        <div>
                          <label className="text-xs font-medium text-gray-700">
                            {test.lastmodified ? 'Last Modified:' : 'Test Date:'}
                          </label>
                          <p className="text-sm text-gray-600 mt-1">
                            {test.lastmodified 
                              ? new Date(test.lastmodified).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : new Date(test.testdate).toLocaleDateString()
                            }
                          </p>
                          {test.lastmodified && test.lastmodifiedby && (
                            <p className="text-xs text-gray-500 mt-1">
                              Modified by: {test.lastmodifiedby}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Show current date info in edit mode */}
                      {isEditing && test.TestType.code !== "CaCorrected" && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          <span className="font-medium">Original Test Date:</span> {new Date(test.testdate).toLocaleDateString()}
                          {test.lastmodified && (
                            <>
                              <br />
                              <span className="font-medium">Last Modified:</span> {new Date(test.lastmodified).toLocaleDateString()}
                            </>
                          )}
                          <br />
                          <span className="text-blue-500">Note: Only test values can be edited</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classification Details */}
          {visitHistory.situation && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-purple-600" />
                Clinical Classification
              </h4>
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Group</p>
                    <p className="text-2xl font-bold text-blue-600">{visitHistory.situation.groupid}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Bucket</p>
                    <p className="text-2xl font-bold text-green-600">{visitHistory.situation.bucketid}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Situation</p>
                    <p className="text-2xl font-bold text-amber-600">{visitHistory.situation.code}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Description:</span> {visitHistory.situation.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-orange-600" />
              Treatment Recommendations
            </h4>
            {visitHistory.recommendations.length > 0 ? (
              <div className="space-y-3">
                {visitHistory.recommendations.map((rec) => (
                  <div key={rec.id} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">
                        <span className="text-orange-600">Q:</span> {rec.Question.text}
                      </p>
                      <p className="text-sm text-gray-700 ml-4">
                        <span className="font-medium text-orange-600">A:</span> {rec.Option.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No recommendations recorded for this visit.</p>
            )}
          </div>

          {/* Clinical Notes */}
          {visitHistory.notes && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-600" />
                Clinical Notes
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{visitHistory.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
