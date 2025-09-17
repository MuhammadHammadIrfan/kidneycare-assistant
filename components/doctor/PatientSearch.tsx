import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, User, Calendar, FileText } from "lucide-react";

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
      setError("Please enter a National ID");
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
    <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
      <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
        <Search className="w-5 h-5 mr-2" />
        Search Patient
      </h3>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-gray-700 mb-2 font-medium">National ID</label>
          <Input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="Enter patient's National ID"
            className="text-black"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white !px-8 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {searchResult && (
        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-lg font-semibold text-green-800 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Patient Found
            </h4>
            <Button
              onClick={handleSelectPatient}
              className="bg-green-600 hover:bg-green-700 text-white !px-8 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
            >
              Select Patient
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600">Name:</p>
              <p className="font-medium text-gray-900">{searchResult.patient.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Age:</p>
              <p className="font-medium text-gray-900">{searchResult.patient.age} years</p>
            </div>
            <div>
              <p className="text-gray-600">Gender:</p>
              <p className="font-medium text-gray-900 capitalize">{searchResult.patient.gender}</p>
            </div>
            <div>
              <p className="text-gray-600">National ID:</p>
              <p className="font-medium text-gray-900">{searchResult.patient.nationalid}</p>
            </div>
            {searchResult.patient.contactinfo && (
              <div>
                <p className="text-gray-600">Contact:</p>
                <p className="font-medium text-gray-900">{searchResult.patient.contactinfo}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600">Registered:</p>
              <p className="font-medium text-gray-900">{formatDate(searchResult.patient.createdat)}</p>
            </div>
          </div>

          {searchResult.recentReport && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Most Recent Report
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Date:</p>
                  <p className="font-medium text-gray-900">{formatDate(searchResult.recentReport.reportdate)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Classification:</p>
                  <p className="font-medium text-gray-900">
                    Group {searchResult.recentReport.Situation?.groupid} - {searchResult.recentReport.Situation?.code}
                  </p>
                </div>
              </div>
              {searchResult.recentReport.notes && (
                <div className="mt-2">
                  <p className="text-gray-600">Notes:</p>
                  <p className="font-medium text-gray-900">{searchResult.recentReport.notes}</p>
                </div>
              )}
            </div>
          )}

          {searchResult.recentTests.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Recent Test Results
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {searchResult.recentTests.slice(0, 6).map((test) => (
                  <div key={test.id} className="bg-white p-2 rounded border">
                    <p className="font-medium text-gray-900">{test.TestType.name}</p>
                    <p className="text-gray-600">
                      {test.value} {test.TestType.unit}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(test.testdate)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}