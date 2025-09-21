import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  TrendingUp,
  Calendar,
  TestTube,
  Activity,
  BarChart3,
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type TrendData = {
  [testCode: string]: {
    metadata: {
      name: string;
      unit: string;
      code: string;
      validityMonths: number;
    };
    visitData: Array<{
      visitNumber: number;
      visitDate: string;
      value: number | null;
      testDate: string | null;
      isCurrentTest: boolean;
      daysSinceTest: number | null;
      testId: string | null;
    }>;
    allResults: Array<{
      id: string;
      value: number;
      testDate: string;
      testDateObj: Date;
    }>;
  };
};

type VisitContext = {
  visitNumber: number;
  date: string;
  formattedDate: string;
  situation?: {
    groupid: number;
    bucketid?: number;
    code: string;
    description: string;
  };
};

interface TrendGraphProps {
  patientId: string;
  patientName?: string;
  showTitle?: boolean;
  height?: number;
}

export default function TrendGraph({
  patientId,
  patientName = 'Patient',
  showTitle = true,
  height = 400,
}: TrendGraphProps) {
  const [trendData, setTrendData] = useState<TrendData>({});
  const [visitContext, setVisitContext] = useState<VisitContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedView, setSelectedView] = useState<
    'combined' | 'grouped' | 'individual'
  >('grouped');
  const [selectedTests, setSelectedTests] = useState<string[]>([
    'CaCorrected',
    'Phos',
  ]); // Default: Corrected Calcium and Phosphate

  // ADD THIS: Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };

    // Check on mount
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Enhanced fetch with retry logic for follow-up visits
  const fetchTrendData = async (isManualRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Add cache-busting parameter to ensure fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/doctor/patient/trends?patientId=${patientId}&t=${timestamp}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trend data');
      }

      // For manual refresh, don't retry even if no data
      if (Object.keys(data.trendData).length === 0 && !isManualRefresh) {
        // Only retry automatically if not a manual refresh and retry count is low
        if (retryCount < 2) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            fetchTrendData(false);
          }, 1000);
          return;
        }
      }

      setTrendData(data.trendData);
      setVisitContext(data.visitContext);
      setRetryCount(0); // Reset retry count on successful fetch

      // Set default selection based on available tests
      const availableTests = Object.keys(data.trendData);
      const defaultTests = ['CaCorrected', 'Phos'].filter((test) =>
        availableTests.includes(test)
      );

      // If default tests not available, select first two available tests
      if (defaultTests.length === 0 && availableTests.length > 0) {
        setSelectedTests(
          availableTests.slice(0, Math.min(2, availableTests.length))
        );
      } else if (selectedTests.length === 0) {
        // Only set default if no tests are currently selected
        setSelectedTests(defaultTests);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setRetryCount(0); // Reset retry count on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchTrendData();
    }
  }, [patientId]); // Remove retryCount from dependencies

  // Fix the manual refresh function:
  const handleRefresh = () => {
    setRetryCount(0); // Reset retry count
    fetchTrendData(true); // Pass true to indicate manual refresh
  };

  // Medical test groupings with colors
  const medicalGroups = {
    'Mineral Metabolism': {
      tests: ['CaCorrected', 'Phos', 'Ca'],
      colors: {
        CaCorrected: '#F59E0B', // Amber
        Phos: '#EF4444', // Red
        Ca: '#3B82F6', // Blue
      },
      description: 'Calcium-Phosphate balance (CKD-MBD)',
    },
    'Protein & PTH': {
      tests: ['PTH', 'Albumin'],
      colors: {
        PTH: '#8B5CF6', // Purple
        Albumin: '#10B981', // Green
      },
      description: 'Parathyroid hormone and protein status',
    },
    'Imaging Studies': {
      tests: ['Echo', 'LARad'],
      colors: {
        Echo: '#6366F1', // Indigo
        LARad: '#EC4899', // Pink
      },
      description: 'Cardiac and radiological findings',
    },
  };

  // Color palette for all tests
  const testColors = {
    PTH: '#8B5CF6', // Purple
    Ca: '#3B82F6', // Blue
    Albumin: '#10B981', // Green
    CaCorrected: '#F59E0B', // Amber
    Phos: '#EF4444', // Red
    Echo: '#6366F1', // Indigo
    LARad: '#EC4899', // Pink
  };

  // Generate chart data for selected tests
  const generateSelectedChartData = () => {
    if (selectedTests.length === 0) return { labels: [], datasets: [] };

    console.log('[TRENDGRAPH] ===== GENERATING CHART DATA =====');
    console.log('[TRENDGRAPH] visitContext:', visitContext);
    console.log('[TRENDGRAPH] selectedTests:', selectedTests);

    // Use visit timeline as x-axis
    const visits = visitContext.map((v) => `Visit ${v.visitNumber}`);
    console.log('[TRENDGRAPH] Generated visit labels:', visits);

    const datasets = selectedTests
      .map((testCode, datasetIndex) => {
        const test = trendData[testCode];
        if (!test || !test.visitData) {
          console.log(`[TRENDGRAPH] No data for test ${testCode}`);
          return null;
        }

        console.log(`[TRENDGRAPH] Processing test ${testCode} (dataset ${datasetIndex}):`);
        console.log(`[TRENDGRAPH] API visitData:`, test.visitData);

        // Ensure visitData length matches visitContext length
        if (test.visitData.length !== visitContext.length) {
          console.warn(
            `[TRENDGRAPH] Length mismatch for ${testCode}: visitData=${test.visitData.length}, visitContext=${visitContext.length}`
          );
        }

        // Direct 1:1 mapping since API ensures proper alignment
        const data = test.visitData.map((visitPoint, index) => {
          // Verify visit number alignment
          if (visitPoint.visitNumber !== visitContext[index]?.visitNumber) {
            console.warn(
              `[TRENDGRAPH] Visit number mismatch at index ${index}: ${visitPoint.visitNumber} vs ${visitContext[index]?.visitNumber}`
            );
          }
          
          console.log(`[TRENDGRAPH] ${testCode} Visit ${visitPoint.visitNumber}: API=${visitPoint.value}, Chart=${visitPoint.value}`);
          return visitPoint.value;
        });

        console.log(`[TRENDGRAPH] Final chart data for ${testCode}:`, data);

        // Create point styles based on test freshness
        const pointBackgroundColor = test.visitData.map((visitPoint) => {
          if (visitPoint.value === null) return 'rgba(0,0,0,0)';
          const baseColor = testColors[testCode as keyof typeof testColors] || '#6B7280';
          return visitPoint.isCurrentTest ? baseColor : `${baseColor}CC`;
        });

        const pointBorderColor = test.visitData.map((visitPoint) => {
          if (visitPoint.value === null) return 'rgba(0,0,0,0)';
          return testColors[testCode as keyof typeof testColors] || '#6B7280';
        });

        const pointRadius = test.visitData.map((visitPoint) => {
          if (visitPoint.value === null) return 0;
          return visitPoint.isCurrentTest ? 8 : 6;
        });

        return {
          label: `${test.metadata.name} (${test.metadata.unit})`,
          data,
          borderColor: testColors[testCode as keyof typeof testColors] || '#6B7280',
          backgroundColor: `${testColors[testCode as keyof typeof testColors] || '#6B7280'}20`,
          pointBackgroundColor,
          pointBorderColor,
          pointRadius,
          pointHoverRadius: test.visitData.map((visitPoint) => 
            visitPoint.value === null ? 0 : 10
          ),
          borderWidth: 3,
          fill: false,
          spanGaps: true,
          tension: 0.4,
        };
      })
      .filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== null);

    console.log('[TRENDGRAPH] ===== FINAL CHART DATA =====');
    console.log('[TRENDGRAPH] Labels:', visits);
    console.log('[TRENDGRAPH] Datasets:', datasets.map(d => ({ label: d.label, data: d.data })));

    return {
      labels: visits,
      datasets,
    };
  };

  // Generate grouped chart data
  const generateGroupedChartData = (groupName: string) => {
    const group = medicalGroups[groupName as keyof typeof medicalGroups];
    const availableTestsInGroup = group.tests.filter((test) => trendData[test] && trendData[test].visitData);

    if (availableTestsInGroup.length === 0) return null;

    console.log(`[GROUPED CHART] ${groupName} - Available tests:`, availableTestsInGroup);

    const maxVisits = Math.max(
      ...availableTestsInGroup.map((test) => trendData[test].visitData?.length || 0)
    );
    const visits = Array.from(
      { length: maxVisits },
      (_, i) => `Visit ${i + 1}`
    );

    const datasets = availableTestsInGroup
      .map((testCode, datasetIndex) => {
        const test = trendData[testCode];
        if (!test || !test.visitData) return null;

        console.log(`[GROUPED CHART] ${groupName} - Dataset ${datasetIndex}: ${testCode}`);

        const data = visits.map((_, visitIndex) => {
          const testData = test.visitData.find(
            (d) => d.visitNumber === visitIndex + 1
          );
          return testData ? testData.value : null;
        });

        return {
          label: `${test.metadata.name} (${test.metadata.unit})`,
          data,
          borderColor: group.colors[testCode as keyof typeof group.colors],
          backgroundColor: `${
            group.colors[testCode as keyof typeof group.colors]
          }20`,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
          fill: false,
        };
      })
      .filter(
        (dataset): dataset is NonNullable<typeof dataset> => dataset !== null
      );

    console.log(`[GROUPED CHART] ${groupName} - Final datasets order:`, datasets.map(d => d.label));

    return {
      labels: visits,
      datasets,
    };
  };

  // Generate chart data for individual test
  const generateIndividualChartData = (testCode: string) => {
    const test = trendData[testCode];
    if (!test || !test.visitData) return null;

    const labels = test.visitData.map((d) => `Visit ${d.visitNumber}`);
    const data = test.visitData.map((d) => d.value);

    return {
      labels,
      datasets: [
        {
          label: `${test.metadata.name} (${test.metadata.unit})`,
          data,
          borderColor:
            testColors[testCode as keyof typeof testColors] || '#6B7280',
          backgroundColor: `${
            testColors[testCode as keyof typeof testColors] || '#6B7280'
          }20`,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
          fill: true,
        },
      ],
    };
  };

  // FIXED: Mobile-responsive chart options with proper mobile detection
  const createChartOptions = (currentView: 'combined' | 'grouped' | 'individual', testCodesForThisChart?: string[], groupName?: string, singleTestCode?: string): ChartOptions<'line'> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'top' as const,
          labels: {
            usePointStyle: true,
            padding: isMobile ? 10 : 20,
            font: {
              size: isMobile ? 10 : isTablet ? 11 : 12,
              weight: 'bold',
            },
            boxWidth: isMobile ? 10 : 12,
            boxHeight: isMobile ? 10 : 12,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          bodyFont: { size: isMobile ? 11 : 13 },
          titleFont: { size: isMobile ? 12 : 14, weight: 'bold' },
          padding: isMobile ? 8 : 12,
          cornerRadius: 8,
          filter: (tooltipItem) => {
            return tooltipItem.parsed.y !== null;
          },
          callbacks: {
            title: (context) => {
              const pointIndex = context[0].dataIndex;
              const visitNum = pointIndex + 1;
              
              const visit = visitContext[pointIndex];
              if (visit) {
                return `Visit ${visitNum} - ${visit.formattedDate}`;
              }
              return `Visit ${visitNum}`;
            },
            label: (context) => {
              const datasetIndex = context.datasetIndex;
              const pointIndex = context.dataIndex;
              
              // Keep your existing label logic exactly the same
              let testCode: string;
              
              if (currentView === 'combined') {
                testCode = selectedTests[datasetIndex];
              } else if (currentView === 'individual') {
                testCode = singleTestCode!;
              } else if (currentView === 'grouped') {
                testCode = testCodesForThisChart![datasetIndex];
              } else {
                console.warn(`[TOOLTIP] Unknown view: ${currentView}`);
                return `${context.dataset.label}: Unknown view`;
              }
              
              console.log(`[TOOLTIP] View: ${currentView}, Dataset ${datasetIndex}, Point ${pointIndex}, Test ${testCode}`);
              
              if (!testCode || !trendData[testCode] || !trendData[testCode].visitData) {
                console.warn(`[TOOLTIP] No data for test ${testCode}`);
                return `${context.dataset.label}: No data available`;
              }
              
              const visitPoint = trendData[testCode].visitData[pointIndex];
              
              console.log(`[TOOLTIP] Visit point for ${testCode}:`, visitPoint);
              
              if (!visitPoint || visitPoint.value === null) {
                console.warn(`[TOOLTIP] No valid test data for ${testCode} at point ${pointIndex}`);
                return `${context.dataset.label}: No valid test data`;
              }

              const apiValue = visitPoint.value;
              const chartValue = context.parsed.y;
              
              if (Math.abs(apiValue - chartValue) > 0.01) {
                console.warn(`[TOOLTIP] Value mismatch! API: ${apiValue}, Chart: ${chartValue}`);
              }

              let label = `${trendData[testCode].metadata.name}: ${apiValue} ${trendData[testCode].metadata.unit}`;

              if (visitPoint.isCurrentTest) {
                label += ` (Current visit test)`;
              } else if (visitPoint.daysSinceTest !== null) {
                if (visitPoint.daysSinceTest === 0) {
                  label += ` (Same day)`;
                } else if (visitPoint.daysSinceTest <= 7) {
                  label += ` (${visitPoint.daysSinceTest} days ago)`;
                } else if (visitPoint.daysSinceTest <= 30) {
                  label += ` (${visitPoint.daysSinceTest} days ago)`;
                } else {
                  label += ` (${visitPoint.daysSinceTest} days ago - older test)`;
                }
              }

              if (visitPoint.testDate) {
                label += ` - Test date: ${visitPoint.testDate}`;
              }

              return label;
            },
            afterBody: (context) => {
              const pointIndex = context[0].dataIndex;
              const visitNum = pointIndex + 1;
              
              let testsToCheck: string[];
              
              if (currentView === 'combined') {
                testsToCheck = selectedTests;
              } else if (currentView === 'individual') {
                testsToCheck = [singleTestCode!];
              } else if (currentView === 'grouped') {
                testsToCheck = testCodesForThisChart!;
              } else {
                return [];
              }
              
              const missingTests = testsToCheck.filter(testCode => {
                const test = trendData[testCode];
                if (!test || !test.visitData) return false;
                const visitPoint = test.visitData[pointIndex];
                return !visitPoint || visitPoint.value === null;
              });

              if (missingTests.length > 0) {
                const missingTestNames = missingTests.map(testCode => {
                  const test = trendData[testCode];
                  return test ? test.metadata.name : testCode;
                });
                
                return [
                  ``,
                  `Missing data for Visit ${visitNum}:`,
                  ...missingTestNames.map(name => `• ${name}`)
                ];
              }
              return [];
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: !isMobile, // Hide title on mobile to save space
            text: 'Visits Over Time',
            font: { size: isMobile ? 10 : isTablet ? 12 : 14, weight: 'bold' },
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
          ticks: {
            font: {
              size: isMobile ? 9 : isTablet ? 10 : 11,
            },
            maxRotation: isMobile ? 45 : 0,
            minRotation: isMobile ? 45 : 0,
          },
        },
        y: {
          title: {
            display: !isMobile, // Hide title on mobile to save space
            text: 'Test Values',
            font: { size: isMobile ? 10 : isTablet ? 12 : 14, weight: 'bold' },
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
          ticks: {
            font: {
              size: isMobile ? 9 : isTablet ? 10 : 11,
            },
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      elements: {
        point: {
          radius: isMobile ? 3 : isTablet ? 4 : 6,
          hoverRadius: isMobile ? 6 : isTablet ? 8 : 12,
        },
        line: {
          borderWidth: isMobile ? 2 : 3,
          tension: 0.4,
          spanGaps: true,
        },
      },
    };
  };

  const handleTestSelection = (testCode: string) => {
    setSelectedTests((prev) =>
      prev.includes(testCode)
        ? prev.filter((t) => t !== testCode)
        : [...prev, testCode]
    );
  };

  const handleGroupPreset = (groupName: string) => {
    const group = medicalGroups[groupName as keyof typeof medicalGroups];
    const availableTests = group.tests.filter((test) => trendData[test]);
    setSelectedTests(availableTests);
    setSelectedView('combined');
  };

  // MOBILE-RESPONSIVE legend component - UPDATE ONLY STYLES
  const renderTestLegend = () => (
    <div className='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 lg:p-4 mb-4 border border-blue-200'>
      <h4 className='text-xs lg:text-sm font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center'>
        <Activity className='w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2 text-blue-600' />
        Visual Legend - Test Data Points
      </h4>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 text-xs'>
        <div className='flex items-center space-x-1 lg:space-x-2'>
          <div className='w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-blue-600 shadow-sm flex-shrink-0'></div>
          <span className='font-medium text-xs'>✨ Fresh test (done this visit)</span>
        </div>
        <div className='flex items-center space-x-1 lg:space-x-2'>
          <div className='w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-blue-600 opacity-80 flex-shrink-0'></div>
          <span className='text-xs'>🕐 Recent test (&lt;30 days)</span>
        </div>
        <div className='flex items-center space-x-1 lg:space-x-2'>
          <div className='w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-blue-600 opacity-50 flex-shrink-0'></div>
          <span className='text-xs'>⏳ Older test (within validity)</span>
        </div>
        <div className='flex items-center space-x-1 lg:space-x-2'>
          <div className='w-2 h-2 border-2 border-gray-400 rounded-full bg-transparent flex-shrink-0'></div>
          <span className='text-gray-600 text-xs'>No valid data</span>
        </div>
      </div>
      <div className='mt-2 text-xs text-gray-600'>
        💡 Hover over data points to see exact test dates and validity information
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className='bg-white rounded-xl shadow-lg p-8 border border-blue-100'>
        <div className='flex items-center justify-center space-x-2'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
          <span className='text-gray-600'>Loading trend data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-white rounded-xl shadow-lg p-8 border border-red-100'>
        <div className='text-center'>
          <div className='text-red-600 mb-2'>⚠️ Error Loading Trends</div>
          <p className='text-gray-600'>{error}</p>
        </div>
      </div>
    );
  }

  if (Object.keys(trendData).length === 0) {
    return (
      <div className='bg-white rounded-xl shadow-lg p-8 border border-gray-100'>
        <div className='text-center'>
          <TestTube className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            No Trend Data Available
          </h3>
          <p className='text-gray-600'>
            No test results found for trend analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-xl shadow-lg p-3 lg:p-6 border border-blue-100 space-y-3 lg:space-y-6'>
      {showTitle && (
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 pb-3 lg:pb-4 space-y-3 lg:space-y-0'>
          <div className='flex items-center space-x-2 lg:space-x-3'>
            <TrendingUp className='w-5 h-5 lg:w-6 lg:h-6 text-blue-600' />
            <div>
              <h3 className='text-base lg:text-xl font-bold text-gray-900'>
                Lab Test Trends
              </h3>
              <p className='text-xs lg:text-sm text-gray-600'>
                {patientName} - {visitContext.length} visits
              </p>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2'>
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className='px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs lg:text-sm font-medium transition-colors disabled:opacity-50'
            >
              {loading ? '⟳' : '↻'} Refresh
            </button>

            {/* View Toggle - Mobile responsive */}
            <div className='flex space-x-1 lg:space-x-2'>
              <button
                onClick={() => setSelectedView('combined')}
                className={`px-2 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                  selectedView === 'combined'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className='hidden sm:inline'>Selected Tests</span>
                <span className='sm:hidden'>Selected</span>
              </button>
              <button
                onClick={() => setSelectedView('grouped')}
                className={`px-2 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                  selectedView === 'grouped'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className='hidden sm:inline'>Medical Groups</span>
                <span className='sm:hidden'>Groups</span>
              </button>
              <button
                onClick={() => setSelectedView('individual')}
                className={`px-2 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                  selectedView === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className='hidden sm:inline'>Individual Charts</span>
                <span className='sm:hidden'>Individual</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical Group Presets - MOBILE RESPONSIVE */}
      <div className='bg-gray-50 rounded-lg p-3 lg:p-4'>
        <h4 className='text-xs lg:text-sm font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center'>
          <BarChart3 className='w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2' />
          Quick Medical Groups
        </h4>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3'>
          {Object.entries(medicalGroups).map(([groupName, group]) => {
            const availableTests = group.tests.filter(
              (test) => trendData[test]
            );
            if (availableTests.length === 0) return null;

            return (
              <button
                key={groupName}
                onClick={() => handleGroupPreset(groupName)}
                className='text-left p-2 lg:p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors'
              >
                <div className='font-medium text-gray-900 text-xs lg:text-sm'>
                  {groupName}
                </div>
                <div className='text-xs text-gray-600 mt-1 leading-tight'>
                  {group.description}
                </div>
                <div className='text-xs text-blue-600 mt-1'>
                  {availableTests.length} test
                  {availableTests.length > 1 ? 's' : ''} available
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Test Selection - MOBILE RESPONSIVE */}
      <div className='bg-gray-50 rounded-lg p-3 lg:p-4'>
        <h4 className='text-xs lg:text-sm font-semibold text-gray-900 mb-2 lg:mb-3'>
          Select Individual Tests
        </h4>
        <div className='flex flex-wrap gap-2'>
          {Object.keys(trendData).map((testCode) => (
            <label
              key={testCode}
              className='flex items-center space-x-1 lg:space-x-2 cursor-pointer'
            >
              <input
                type='checkbox'
                checked={selectedTests.includes(testCode)}
                onChange={() => handleTestSelection(testCode)}
                className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3 lg:w-4 lg:h-4'
              />
              <span
                className='text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded-full'
                style={{
                  backgroundColor: `${
                    testColors[testCode as keyof typeof testColors]
                  }20`,
                  color: testColors[testCode as keyof typeof testColors],
                }}
              >
                {trendData[testCode].metadata.name}
              </span>
            </label>
          ))}
        </div>
        <p className='text-xs text-gray-500 mt-2'>
          💡 Tip: Select tests with similar value ranges for better visualization
        </p>
      </div>

      {/* Test Data Points Legend - MOBILE RESPONSIVE */}
      {renderTestLegend()}

      {/* Charts - MOBILE RESPONSIVE - FIXED HEIGHT CALCULATION */}
      {selectedView === 'combined' ? (
        // Selected Tests Chart
        <div style={{ height: `${isMobile ? Math.min(height, 300) : height}px` }}>
          {selectedTests.length > 0 ? (
            <Line 
              data={generateSelectedChartData()} 
              options={createChartOptions('combined')} 
            />
          ) : (
            <div className='flex items-center justify-center h-full text-gray-500 text-sm lg:text-base'>
              Select at least one test to view trends
            </div>
          )}
        </div>
      ) : selectedView === 'grouped' ? (
        // Medical Groups View - MOBILE RESPONSIVE
        <div className='space-y-4 lg:space-y-6'>
          {Object.entries(medicalGroups).map(([groupName, group]) => {
            const chartData = generateGroupedChartData(groupName);
            if (!chartData) return null;

            const availableTestsInGroup = group.tests.filter((test) => trendData[test] && trendData[test].visitData);

            return (
              <div
                key={groupName}
                className='border border-gray-200 rounded-lg p-3 lg:p-4'
              >
                <h4 className='text-base lg:text-lg font-semibold text-gray-900 mb-1 lg:mb-2'>
                  {groupName}
                </h4>
                <p className='text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4'>
                  {group.description}
                </p>
                <div style={{ height: isMobile ? '250px' : '300px' }}>
                  <Line 
                    data={chartData} 
                    options={createChartOptions('grouped', availableTestsInGroup, groupName)} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Individual Charts - MOBILE RESPONSIVE
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6'>
          {selectedTests.map((testCode) => {
            const chartData = generateIndividualChartData(testCode);
            if (!chartData) return null;

            return (
              <div
                key={testCode}
                className='border border-gray-200 rounded-lg p-3 lg:p-4'
              >
                <h4 className='text-sm lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center'>
                  <Activity
                    className='w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2'
                    style={{
                      color: testColors[testCode as keyof typeof testColors],
                    }}
                  />
                  {trendData[testCode].metadata.name}
                </h4>
                <div style={{ height: isMobile ? '200px' : '250px' }}>
                  <Line 
                    data={chartData} 
                    options={createChartOptions('individual', undefined, undefined, testCode)} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visit Timeline - MOBILE RESPONSIVE WITH CLINICAL INTERPRETATION */}
      <div className='border-t border-gray-200 pt-3 lg:pt-4'>
        <h4 className='text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center'>
          <Calendar className='w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2 text-gray-600' />
          Visit Timeline
        </h4>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3'>
          {visitContext.map((visit, index) => (
            <div
              key={index}
              className='bg-gray-50 rounded-lg p-2 lg:p-3 border border-gray-200'
            >
              <div className='flex flex-col space-y-2'>
                {/* Visit Header */}
                <div className='flex justify-between items-start'>
                  <div>
                    <p className='font-medium text-gray-900 text-xs lg:text-sm'>
                      Visit {visit.visitNumber}
                    </p>
                    <p className='text-xs text-gray-600'>{visit.formattedDate}</p>
                  </div>
                </div>

                {/* Clinical Classification Badges */}
                {visit.situation && (
                  <div className='flex flex-wrap gap-1 items-center'>
                    {/* Vascular Classification based on groupid */}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      visit.situation.groupid === 1 
                        ? 'bg-red-100/80 text-red-800' 
                        : 'bg-green-100/80 text-green-800'
                    }`}>
                      {visit.situation.groupid === 1 ? 'Vascular (+)' : 'Vascular (-)'}
                    </span>
                    
                    {/* PTH Range based on bucketid */}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      visit.situation.bucketid === 1 || visit.situation.bucketid === 3
                        ? 'bg-orange-100/80 text-orange-800' 
                        : 'bg-blue-100/80 text-blue-800'
                    }`}>
                      PTH: {
                        visit.situation.bucketid === 1 ? 'High' :
                        visit.situation.bucketid === 2 ? 'Normal' :
                        visit.situation.bucketid === 3 ? 'Low' :
                        'Unknown'
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
