import React from "react";
import { Printer, Calendar, User, TestTube, FileText, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";

type PatientData = {
  name: string;
  age: number;
  gender: string;
  nationalid: string;
  contactinfo?: string;
};

type TestValues = {
  PTH: string;
  Ca: string;
  Albumin: string;
  CaCorrected: string;
  Phos: string;
  Echo: string;
  LARad: string;
};

type ClassificationResult = {
  group: number;
  bucket: number;
  situation: string;
};

type RecommendationData = {
  questionText: string;
  selectedOptionText: string;
  category?: string;
};

type MedicationData = {
  id: number;
  name: string;
  unit: string;
  groupname: string;
  dosage: number;
};

interface PatientReportProps {
  patient: PatientData;
  testValues: TestValues;
  classification: ClassificationResult;
  recommendations: RecommendationData[];
  medications?: MedicationData[];
  visitType: "initial" | "followup";
  doctorName?: string;
  visitDate?: string;
  notes?: string;
}

export default function PatientReport({
  patient,
  testValues,
  classification,
  recommendations,
  medications = [],
  visitType,
  doctorName = "Dr. [Doctor Name]",
  visitDate = new Date().toLocaleDateString(),
  notes = ""
}: PatientReportProps) {
  
  // Add helper functions for formatting special test values
  const formatEchoValue = (value: string): string => {
    if (value === "1" || value === "true") return "Positive";
    if (value === "0" || value === "false") return "Negative";
    return value;
  };

  const formatLARadValue = (value: string): string => {
    if (value === "1" || value === "true") return "Positive";
    if (value === "0" || value === "false") return "Negative";
    return value;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('patient-report-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Patient Medical Report - ${patient.name}</title>
            <meta charset="UTF-8">
            <style>
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body { 
                font-family: 'Arial', sans-serif; 
                line-height: 1.5; 
                color: #000000 !important; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px;
                background: white !important;
              }
              
              /* Match the exact web styling */
              #patient-report-content {
                background: white !important;
                padding: 32px !important; /* p-8 = 32px */
                border-radius: 8px !important;
                border: 1px solid #e5e7eb !important;
                color: #000000 !important;
              }
              
              /* Header styling - matches web */
              .text-center { text-align: center !important; }
              .border-b-4 { border-bottom: 4px solid !important; }
              .border-blue-600 { border-color: #2563eb !important; }
              .pb-6 { padding-bottom: 24px !important; }
              .mb-8 { margin-bottom: 32px !important; }
              .mb-2 { margin-bottom: 8px !important; }
              .mb-3 { margin-bottom: 12px !important; }
              .mb-4 { margin-bottom: 16px !important; }
              .mb-1 { margin-bottom: 4px !important; }
              
              .text-2xl { font-size: 24px !important; font-weight: bold !important; }
              .text-xl { font-size: 20px !important; font-weight: bold !important; }
              .text-lg { font-size: 18px !important; font-weight: bold !important; }
              .text-sm { font-size: 14px !important; }
              .text-xs { font-size: 12px !important; }
              
              .text-blue-700 { color: #1d4ed8 !important; }
              .text-black { color: #000000 !important; }
              .text-gray-600 { color: #4b5563 !important; }
              
              .font-bold { font-weight: bold !important; }
              .font-medium { font-weight: 500 !important; }
              .uppercase { text-transform: uppercase !important; }
              .italic { font-style: italic !important; }
              
              /* Section styling - matches web */
              .p-3 { padding: 12px !important; }
              .p-4 { padding: 16px !important; }
              .bg-gray-100 { background-color: #f3f4f6 !important; }
              .bg-gray-50 { background-color: #f9fafb !important; }
              .bg-blue-50 { background-color: #eff6ff !important; }
              .bg-green-50 { background-color: #f0fdf4 !important; }
              .bg-amber-50 { background-color: #fffbeb !important; }
              .bg-amber-100 { background-color: #fef3c7 !important; }
              
              .border-l-4 { border-left: 4px solid !important; }
              .border { border: 1px solid !important; }
              .border-2 { border: 2px solid !important; }
              .border-gray-300 { border-color: #d1d5db !important; }
              .border-gray-400 { border-color: #9ca3af !important; }
              .border-blue-400 { border-color: #60a5fa !important; }
              .border-green-400 { border-color: #4ade80 !important; }
              .border-amber-400 { border-color: #fbbf24 !important; }
              
              .rounded { border-radius: 4px !important; }
              .rounded-lg { border-radius: 8px !important; }
              
              /* Grid layouts - matches web */
              .grid { display: grid !important; }
              .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
              .grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
              .gap-3 { gap: 12px !important; }
              .gap-4 { gap: 16px !important; }
              
              /* Spacing - matches web */
              .space-y-3 > * + * { margin-top: 12px !important; }
              .space-y-2 > * + * { margin-top: 8px !important; }
              
              /* Text alignment */
              .text-center { text-align: center !important; }
              
              /* Flexbox */
              .flex { display: flex !important; }
              .items-center { align-items: center !important; }
              .gap-2 { gap: 8px !important; }
              
              /* Whitespace */
              .whitespace-pre-wrap { white-space: pre-wrap !important; }
              .leading-relaxed { line-height: 1.625 !important; }
              
              /* Border top */
              .border-t-2 { border-top: 2px solid !important; }
              .pt-6 { padding-top: 24px !important; }
              
              /* Page break */
              .page-break-inside-avoid { page-break-inside: avoid !important; }
              
              @media print {
                body { 
                  margin: 0 !important; 
                  padding: 15px !important; 
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print { display: none !important; }
                .page-break { page-break-before: always !important; }
                * {
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Give more time for styles to load
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Print Button */}
      <div className="flex justify-center no-print">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </button>
      </div>

      {/* Report Content */}
      <div id="patient-report-content" className="bg-white p-8 rounded-lg border text-black">
        {/* Header */}
        <div className="text-center border-b-4 border-blue-600 pb-6 mb-8">
          <h1 className="text-2xl font-bold text-blue-700 mb-2">KidneyCare Assistant</h1>
          <p className="text-sm text-black mb-3">
            Chronic Kidney Disease - Mineral and Bone Disorder Support System
          </p>
          <h2 className="text-xl font-bold text-black">
            Patient Medical Report - {visitType === "initial" ? "Initial Visit" : "Follow-up Visit"}
          </h2>
        </div>

        {/* Patient Information */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-black mb-4 p-3 bg-gray-100 border-l-4 border-blue-600">
            Patient Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-gray-300 rounded">
              <div className="text-xs font-bold text-black uppercase mb-1">Patient Name</div>
              <div className="text-black font-medium">{patient.name}</div>
            </div>
            <div className="p-3 border border-gray-300 rounded">
              <div className="text-xs font-bold text-black uppercase mb-1">Age</div>
              <div className="text-black font-medium">{patient.age} years</div>
            </div>
            <div className="p-3 border border-gray-300 rounded">
              <div className="text-xs font-bold text-black uppercase mb-1">Gender</div>
              <div className="text-black font-medium">{patient.gender}</div>
            </div>
            <div className="p-3 border border-gray-300 rounded">
              <div className="text-xs font-bold text-black uppercase mb-1">National ID</div>
              <div className="text-black font-medium">{patient.nationalid}</div>
            </div>
            <div className="p-3 border border-gray-300 rounded">
              <div className="text-xs font-bold text-black uppercase mb-1">Visit Date</div>
              <div className="text-black font-medium">{visitDate}</div>
            </div>
            <div className="p-3 border border-gray-300 rounded">
              <div className="text-xs font-bold text-black uppercase mb-1">Doctor</div>
              <div className="text-black font-medium">{doctorName}</div>
            </div>
          </div>
        </div>

        {/* Laboratory Results */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-black mb-4 p-3 bg-gray-100 border-l-4 border-blue-600">
            Laboratory Results
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 border border-gray-400 rounded text-center">
              <div className="text-xs text-black font-bold mb-1">iPTH</div>
              <div className="text-lg font-bold text-black">{testValues.PTH} pg/mL</div>
            </div>
            <div className="p-4 border border-gray-400 rounded text-center">
              <div className="text-xs text-black font-bold mb-1">Calcium</div>
              <div className="text-lg font-bold text-black">{testValues.Ca} mg/dL</div>
            </div>
            <div className="p-4 border border-gray-400 rounded text-center">
              <div className="text-xs text-black font-bold mb-1">Albumin</div>
              <div className="text-lg font-bold text-black">{testValues.Albumin} g/dL</div>
            </div>
            <div className="p-4 border border-gray-400 rounded text-center">
              <div className="text-xs text-black font-bold mb-1">Corrected Calcium</div>
              <div className="text-lg font-bold text-black">{testValues.CaCorrected} mg/dL</div>
            </div>
            <div className="p-4 border border-gray-400 rounded text-center">
              <div className="text-xs text-black font-bold mb-1">Phosphate</div>
              <div className="text-lg font-bold text-black">{testValues.Phos} mg/dL</div>
            </div>
            <div className="p-4 border border-gray-400 rounded text-center">
              <div className="text-xs text-black font-bold mb-1">Imaging</div>
              <div className="text-sm font-bold text-black">
                Echo: {formatEchoValue(testValues.Echo)}<br />
                LA Rad: {formatLARadValue(testValues.LARad)}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Classification */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-black mb-4 p-3 bg-gray-100 border-l-4 border-blue-600">
            Clinical Classification
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border-2 border-blue-400 bg-blue-50 rounded text-center">
              <div className="text-xs font-bold text-black uppercase mb-1">Group</div>
              <div className="text-xl font-bold text-black">{classification.group}</div>
            </div>
            <div className="p-4 border-2 border-green-400 bg-green-50 rounded text-center">
              <div className="text-xs font-bold text-black uppercase mb-1">Bucket</div>
              <div className="text-xl font-bold text-black">{classification.bucket}</div>
            </div>
            <div className="p-4 border-2 border-amber-400 bg-amber-50 rounded text-center">
              <div className="text-xs font-bold text-black uppercase mb-1">Situation</div>
              <div className="text-xl font-bold text-black">{classification.situation}</div>
            </div>
          </div>
        </div>

        {/* Treatment Recommendations */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-black mb-4 p-3 bg-gray-100 border-l-4 border-blue-600">
            Treatment Recommendations
          </h3>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-3 border border-gray-300 bg-gray-50 rounded">
                  <div className="text-sm font-bold text-black mb-1">
                    {rec.questionText}
                  </div>
                  <div className="text-black font-medium">
                    ✓ {rec.selectedOptionText}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-gray-300 bg-gray-50 rounded text-center">
              <p className="text-gray-600 italic">No specific recommendations recorded for this visit.</p>
            </div>
          )}
        </div>

        {/* Medication Prescriptions */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-black mb-4 p-3 bg-gray-100 border-l-4 border-blue-600">
            Medication Prescriptions
          </h3>
          {medications.length > 0 ? (
            (() => {
              // Group medications by category
              const groupedMedications = medications.reduce((acc, med) => {
                if (!acc[med.groupname]) acc[med.groupname] = [];
                acc[med.groupname].push(med);
                return acc;
              }, {} as Record<string, MedicationData[]>);

              // Filter out medications with 0 dosage
              const prescribedMedications = Object.keys(groupedMedications).reduce((acc, group) => {
                const meds = groupedMedications[group].filter(med => med.dosage > 0);
                if (meds.length > 0) {
                  acc[group] = meds;
                }
                return acc;
              }, {} as Record<string, MedicationData[]>);

              return Object.keys(prescribedMedications).length > 0 ? (
                <div className="space-y-4">
                  {Object.keys(prescribedMedications).map(group => (
                    <div key={group} className="border border-gray-300 rounded-lg">
                      <div className="bg-blue-50 p-3 border-b border-gray-300">
                        <h4 className="font-bold text-black">{group}</h4>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-1 gap-2">
                          {prescribedMedications[group].map(med => (
                            <div key={med.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-black font-medium">{med.name}</span>
                              <span className="text-black font-bold">{med.dosage} {med.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-gray-300 bg-gray-50 rounded text-center">
                  <p className="text-gray-600 italic">No medications prescribed for this visit.</p>
                </div>
              );
            })()
          ) : (
            <div className="p-4 border border-gray-300 bg-gray-50 rounded text-center">
              <p className="text-gray-600 italic">No medication data available for this visit.</p>
            </div>
          )}
        </div>

        {/* Clinical Notes */}
        {notes && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-black mb-4 p-3 bg-gray-100 border-l-4 border-blue-600">
              Clinical Notes
            </h3>
            <div className="p-4 border border-gray-300 bg-gray-50 rounded">
              <p className="text-black leading-relaxed whitespace-pre-wrap">{notes}</p>
            </div>
          </div>
        )}

        {/* Important Patient Information */}
        <div className="mb-8">
          <div className="bg-amber-100 border border-amber-400 rounded-lg p-4">
            <h4 className="font-bold text-black mb-2 flex items-center gap-2">
              ⚠️ Important Patient Information
            </h4>
            <div className="text-black text-sm leading-relaxed space-y-2">
              <p>• Follow all medication instructions as prescribed by your doctor</p>
              <p>• Take medications at the same time each day for consistent results</p>
              <p>• Do not stop or change medication dosages without consulting your doctor</p>
              <p>• Attend all scheduled follow-up appointments for medication monitoring</p>
              <p>• Report any unusual symptoms or side effects immediately</p>
              <p>• Maintain a kidney-friendly diet as advised</p>
              <p>• Keep this report for your medical records and bring it to your next visit</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 text-center">
          <p className="text-black text-sm">
            Generated by KidneyCare Assistant | {new Date().toLocaleString()} | This is a computer-generated report
          </p>
        </div>
      </div>
    </div>
  );
}