import React from "react";
import { Calendar, FileText, TestTube, User, Activity } from "lucide-react";

// Update type definitions to match database column names

type TestResult = {
  id: string; // Changed to string to match UUID
  value: number;
  testdate: string; // lowercase
  testtypeid: number; // lowercase
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
};

interface RecommendationHistoryDisplayProps {
  visitHistory: VisitHistory;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function RecommendationHistoryDisplay({
  visitHistory,
  isExpanded,
  onToggle
}: RecommendationHistoryDisplayProps) {
  
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

  const getBucketFromCode = (code: string): number => {
    // Extract bucket number from situation code (e.g., "T1" -> 1)
    const match = code.match(/T(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Sort test results in the preferred order for display
  const sortedTestResults = [...visitHistory.testResults].sort((a, b) => {
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

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden bg-white shadow-sm">
      {/* Header - Always Visible */}
      <div 
        className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Visit Date: {formatDate(visitHistory.visitDate)}
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                {visitHistory.situation && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Classification:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Group {visitHistory.situation.groupid}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Bucket {getBucketFromCode(visitHistory.situation.code)}
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
            <span className="text-sm text-gray-500">
              {visitHistory.recommendations.length} recommendation(s)
            </span>
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </div>
        </div>
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
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedTestResults.map((test) => (
                  <div key={test.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-gray-900">{test.TestType.name}</h5>
                        <p className="text-sm text-gray-600">{test.TestType.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-blue-600">
                          {formatTestValue(test)}
                        </p>
                      </div>
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
                    <p className="text-2xl font-bold text-green-600">{getBucketFromCode(visitHistory.situation.code)}</p>
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
