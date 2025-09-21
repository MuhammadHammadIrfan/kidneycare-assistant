import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, User, Calendar, FileText, Phone, MapPin, Clock } from "lucide-react";

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  nationalid: string;
  contactinfo: string;
  createdat: string;
};

type RecentReport = {
  id: string;
  reportdate: string;
  notes: string;
  Situation: {
    id: number;
    groupid: number;
    code: string;
    description: string;
  };
};

type TestResult = {
  id: string;
  value: number;
  testdate: string;
  TestType: {
    id: number;
    code: string;
    name: string;
    unit: string;
  };
};

export default function PatientSearch({
  onPatientFound,
}: {
  onPatientFound: (patient: Patient, recentReport: RecentReport | null, recentTests: TestResult[]) => void;
}) {
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<{
    patient: Patient;
    recentReport: RecentReport | null;
    recentTests: TestResult[];
  } | null>(null);

  const handleSearch = async () => {
    if (!nationalId.trim()) {
      setError("Please enter a Hospital ID");
      {/* Natioal Id is used allover in backed and db, just for frontend changed to Hospital Id */}
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const response = await fetch(`/api/doctor/patient/search?nationalId=${encodeURIComponent(nationalId.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search patient");
      }

      setSearchResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while searching");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = () => {
    if (searchResult) {
      onPatientFound(searchResult.patient, searchResult.recentReport, searchResult.recentTests);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
      <h3 className="text-lg lg:text-xl font-bold text-blue-900 mb-4 lg:mb-6 flex items-center">
        <Search className="w-5 h-5 mr-2" />
        Search Patient
      </h3>

      {/* Search Form - MOBILE RESPONSIVE */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 mb-4 lg:mb-6">
        <div className="flex-1">
          <label className="block text-gray-700 mb-2 font-medium text-sm lg:text-base">Hospital ID</label>
          {/* Natioal Id is used allover in backed and db, just for frontend changed to Hospital Id */}
          <Input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="Enter patient's Hospital ID"
            className="text-black h-10 lg:h-12 text-sm lg:text-base"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 lg:px-8 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Searching...</span>
                <span className="sm:hidden">...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
                <span className="sm:hidden">Go</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 lg:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm lg:text-base">{error}</p>
        </div>
      )}

      {/* Search Results - MOBILE RESPONSIVE */}
      {searchResult && (
        <div className="mb-4 lg:mb-6 p-4 lg:p-6 bg-green-50 border border-green-200 rounded-lg">
          {/* Header with Select Button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
            <h4 className="text-base lg:text-lg font-semibold text-green-800 flex items-center">
              <User className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
              Patient Found
            </h4>
            <Button
              onClick={handleSelectPatient}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 lg:px-8 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base"
            >
              Select Patient
            </Button>
          </div>

          {/* Patient Basic Info - MOBILE RESPONSIVE GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <p className="text-gray-600 text-xs lg:text-sm font-medium">Patient Name</p>
              <p className="font-semibold text-gray-900 text-sm lg:text-base break-words">{searchResult.patient.name}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <p className="text-gray-600 text-xs lg:text-sm font-medium">Age & Gender</p>
              <p className="font-semibold text-gray-900 text-sm lg:text-base">{searchResult.patient.age} years, {searchResult.patient.gender}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-100 sm:col-span-2">
              <p className="text-gray-600 text-xs lg:text-sm font-medium">Hospital ID</p>
              {/* Natioal Id is used allover in backed and db, just for frontend changed to Hospital Id */}
              <p className="font-semibold text-gray-900 text-sm lg:text-base break-all">{searchResult.patient.nationalid}</p>
            </div>
            {searchResult.patient.contactinfo && (
              <div className="bg-white p-3 rounded-lg border border-green-100">
                <p className="text-gray-600 text-xs lg:text-sm font-medium flex items-center">
                  <Phone className="w-3 h-3 mr-1" />
                  Contact
                </p>
                <p className="font-semibold text-gray-900 text-sm lg:text-base break-words">{searchResult.patient.contactinfo}</p>
              </div>
            )}
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <p className="text-gray-600 text-xs lg:text-sm font-medium flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Registered
              </p>
              <p className="font-semibold text-gray-900 text-sm lg:text-base">{formatDate(searchResult.patient.createdat)}</p>
            </div>
          </div>

          {/* Recent Report - MOBILE RESPONSIVE */}
          {searchResult.recentReport && (
            <div className="mt-4 p-3 lg:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2 lg:mb-3 flex items-center text-sm lg:text-base">
                <FileText className="w-4 h-4 mr-2" />
                Most Recent Report
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
                <div className="bg-white p-2 lg:p-3 rounded border border-blue-100">
                  <p className="text-gray-600 text-xs font-medium">Report Date</p>
                  <p className="font-semibold text-gray-900 text-xs lg:text-sm">{formatDate(searchResult.recentReport.reportdate)}</p>
                </div>
                <div className="bg-white p-2 lg:p-3 rounded border border-blue-100">
                  <p className="text-gray-600 text-xs font-medium">Classification</p>
                  <p className="font-semibold text-gray-900 text-xs lg:text-sm">
                    Group {searchResult.recentReport.Situation?.groupid} - {searchResult.recentReport.Situation?.code}
                  </p>
                </div>
              </div>
              {searchResult.recentReport.notes && (
                <div className="mt-2 lg:mt-3 bg-white p-2 lg:p-3 rounded border border-blue-100">
                  <p className="text-gray-600 text-xs font-medium">Notes</p>
                  <p className="font-medium text-gray-900 text-xs lg:text-sm break-words">{searchResult.recentReport.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Recent Tests - MOBILE RESPONSIVE */}
          {searchResult.recentTests.length > 0 && (
            <div className="mt-4 p-3 lg:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-semibold text-yellow-800 mb-2 lg:mb-3 flex items-center text-sm lg:text-base">
                <Calendar className="w-4 h-4 mr-2" />
                Recent Test Results
              </h5>
              
              {/* Mobile: Stack vertically, Desktop: Grid */}
              <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-2 lg:gap-3">
                {searchResult.recentTests.slice(0, 6).map((test) => (
                  <div key={test.id} className="bg-white p-2 lg:p-3 rounded border border-yellow-100">
                    <div className="flex flex-col">
                      <p className="font-semibold text-gray-900 text-xs lg:text-sm truncate">{test.TestType.name}</p>
                      <p className="text-gray-600 text-xs lg:text-sm font-medium">
                        {test.value} {test.TestType.unit}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(test.testdate)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Show count if more tests available */}
              {searchResult.recentTests.length > 6 && (
                <div className="mt-2 lg:mt-3 text-center">
                  <p className="text-yellow-700 text-xs lg:text-sm font-medium">
                    +{searchResult.recentTests.length - 6} more test results available
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}