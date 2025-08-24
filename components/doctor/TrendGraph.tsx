import React, { useEffect, useState } from 'react';
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

    // Use visit timeline as x-axis
    const visits = visitContext.map((v) => `Visit ${v.visitNumber}`);

    const datasets = selectedTests
      .map((testCode) => {
        const test = trendData[testCode];
        if (!test || !test.visitData) return null; // Add null check for visitData

        // Map test data to visit timeline
        const data = visitContext.map((visit) => {
          const testDataPoint = test.visitData.find(
            (d) => d.visitNumber === visit.visitNumber
          );
          return testDataPoint ? testDataPoint.value : null;
        });

        // Create point styles based on test freshness
        const pointBackgroundColor = visitContext.map((visit) => {
          const testDataPoint = test.visitData.find(
            (d) => d.visitNumber === visit.visitNumber
          );
          if (!testDataPoint || testDataPoint.value === null) return 'transparent';

          const baseColor = testColors[testCode as keyof typeof testColors];

          if (testDataPoint.isCurrentTest) {
            return baseColor; // Fresh test - solid color
          } else if (
            testDataPoint.daysSinceTest !== null &&
            testDataPoint.daysSinceTest <= 30
          ) {
            return `${baseColor}CC`; // Recent test - 80% opacity
          } else {
            return `${baseColor}80`; // Older test - 50% opacity
          }
        });

        const pointBorderColor = visitContext.map((visit) => {
          const testDataPoint = test.visitData.find(
            (d) => d.visitNumber === visit.visitNumber
          );
          if (!testDataPoint || testDataPoint.value === null) return 'transparent';
          return testColors[testCode as keyof typeof testColors];
        });

        // Create point radius based on test freshness
        const pointRadius = visitContext.map((visit) => {
          const testDataPoint = test.visitData.find(
            (d) => d.visitNumber === visit.visitNumber
          );
          if (!testDataPoint || testDataPoint.value === null) return 0;

          if (testDataPoint.isCurrentTest) {
            return 8; // Fresh test - larger point
          } else {
            return 6; // Older test - normal point
          }
        });

        return {
          label: `${test.metadata.name} (${test.metadata.unit})`,
          data,
          borderColor: testColors[testCode as keyof typeof testColors] || '#6B7280',
          backgroundColor: `${testColors[testCode as keyof typeof testColors] || '#6B7280'}20`,
          pointBackgroundColor,
          pointBorderColor,
          pointRadius,
          pointHoverRadius: 10,
          borderWidth: 3,
          fill: false,
          spanGaps: true, // Connect points even with null values
          tension: 0.4,
        };
      })
      .filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== null);

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

    const maxVisits = Math.max(
      ...availableTestsInGroup.map((test) => trendData[test].visitData?.length || 0)
    );
    const visits = Array.from(
      { length: maxVisits },
      (_, i) => `Visit ${i + 1}`
    );

    const datasets = availableTestsInGroup
      .map((testCode) => {
        const test = trendData[testCode];
        if (!test || !test.visitData) return null;

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
      ); // FIX: Type-safe filter

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

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold',
          },
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
        bodyFont: {
          size: 13,
        },
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        callbacks: {
          title: (context) => {
            const visitNum = context[0].dataIndex + 1;
            const visit = visitContext.find((v) => v.visitNumber === visitNum);
            return visit
              ? `Visit ${visitNum} - ${visit.formattedDate}`
              : `Visit ${visitNum}`;
          },
          label: (context) => {
            // Fix: Safely get the test code and test data
            const testCode = selectedTests[context.datasetIndex];
            if (!testCode || !trendData[testCode]) {
              return `${context.dataset.label}: No data available`;
            }
            
            const test = trendData[testCode];
            if (!test.visitData) {
              return `${context.dataset.label}: No visit data`;
            }
            
            const visitNum = context.dataIndex + 1;
            const testDataPoint = test.visitData.find(
              (d) => d.visitNumber === visitNum
            );

            if (!testDataPoint || testDataPoint.value === null) {
              return `${context.dataset.label}: No valid test data`;
            }

            let label = `${context.dataset.label}: ${testDataPoint.value}`;

            if (testDataPoint.isCurrentTest) {
              label += ` ✨ (Fresh - tested this visit)`;
            } else if (testDataPoint.daysSinceTest !== null) {
              if (testDataPoint.daysSinceTest === 0) {
                label += ` ✨ (Same day)`;
              } else if (testDataPoint.daysSinceTest <= 7) {
                label += ` 🕐 (${testDataPoint.daysSinceTest} days ago)`;
              } else if (testDataPoint.daysSinceTest <= 30) {
                label += ` ⏳ (${testDataPoint.daysSinceTest} days ago)`;
              } else {
                label += ` ⚠️ (${testDataPoint.daysSinceTest} days ago)`;
              }

              if (testDataPoint.testDate) {
                label += ` - Test date: ${testDataPoint.testDate}`;
              }
            }

            return label;
          },
          afterBody: (context) => {
            const visitNum = context[0].dataIndex + 1;
            const visit = visitContext.find((v) => v.visitNumber === visitNum);
            const additionalInfo = [];

            if (visit?.situation) {
              additionalInfo.push(
                `📊 Classification: Group ${visit.situation.groupid}, ${visit.situation.code}`
              );
            }

            // Add validity information for the first test in tooltip
            if (context.length > 0) {
              const testCode = selectedTests[0];
              if (testCode && trendData[testCode]) {
                const test = trendData[testCode];
                additionalInfo.push(
                  `⏱️ Test validity: ${test.metadata.validityMonths} month(s)`
                );
              }
            }

            return additionalInfo;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Visits Over Time',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Test Values',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        beginAtZero: false,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
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

  const renderTestLegend = () => (
    <div className='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200'>
      <h4 className='text-sm font-semibold text-gray-900 mb-3 flex items-center'>
        <Activity className='w-4 h-4 mr-2 text-blue-600' />
        Visual Legend - Test Data Points
      </h4>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-3 text-xs'>
        <div className='flex items-center space-x-2'>
          <div className='w-4 h-4 rounded-full bg-blue-600 shadow-sm'></div>
          <span className='font-medium'>✨ Fresh test (done this visit)</span>
        </div>
        <div className='flex items-center space-x-2'>
          <div className='w-3 h-3 rounded-full bg-blue-600 opacity-80'></div>
          <span>🕐 Recent test (&lt;30 days)</span>
        </div>
        <div className='flex items-center space-x-2'>
          <div className='w-3 h-3 rounded-full bg-blue-600 opacity-50'></div>
          <span>⏳ Older test (within validity)</span>
        </div>
        <div className='flex items-center space-x-2'>
          <div className='w-2 h-2 border-2 border-gray-400 rounded-full bg-transparent'></div>
          <span className='text-gray-600'>No valid data</span>
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
    <div className='bg-white rounded-xl shadow-lg p-6 border border-blue-100 space-y-6'>
      {showTitle && (
        <div className='flex items-center justify-between border-b border-gray-200 pb-4'>
          <div className='flex items-center space-x-3'>
            <TrendingUp className='w-6 h-6 text-blue-600' />
            <div>
              <h3 className='text-xl font-bold text-gray-900'>
                Lab Test Trends
              </h3>
              <p className='text-sm text-gray-600'>
                {patientName} - {visitContext.length} visits
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className='px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50'
            >
              {loading ? '⟳' : '↻'} Refresh
            </button>

            {/* View Toggle */}
            <div className='flex space-x-2'>
              <button
                onClick={() => setSelectedView('combined')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedView === 'combined'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Selected Tests
              </button>
              <button
                onClick={() => setSelectedView('grouped')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedView === 'grouped'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Medical Groups
              </button>
              <button
                onClick={() => setSelectedView('individual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedView === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Individual Charts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical Group Presets */}
      <div className='bg-gray-50 rounded-lg p-4'>
        <h4 className='text-sm font-semibold text-gray-900 mb-3 flex items-center'>
          <BarChart3 className='w-4 h-4 mr-2' />
          Quick Medical Groups
        </h4>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {Object.entries(medicalGroups).map(([groupName, group]) => {
            const availableTests = group.tests.filter(
              (test) => trendData[test]
            );
            if (availableTests.length === 0) return null;

            return (
              <button
                key={groupName}
                onClick={() => handleGroupPreset(groupName)}
                className='text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors'
              >
                <div className='font-medium text-gray-900 text-sm'>
                  {groupName}
                </div>
                <div className='text-xs text-gray-600 mt-1'>
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

      {/* Individual Test Selection */}
      <div className='bg-gray-50 rounded-lg p-4'>
        <h4 className='text-sm font-semibold text-gray-900 mb-3'>
          Select Individual Tests
        </h4>
        <div className='flex flex-wrap gap-2'>
          {Object.keys(trendData).map((testCode) => (
            <label
              key={testCode}
              className='flex items-center space-x-2 cursor-pointer'
            >
              <input
                type='checkbox'
                checked={selectedTests.includes(testCode)}
                onChange={() => handleTestSelection(testCode)}
                className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              />
              <span
                className='text-sm font-medium px-3 py-1 rounded-full'
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
          💡 Tip: Select tests with similar value ranges for better
          visualization
        </p>
      </div>

      {/* Test Data Points Legend */}
      {renderTestLegend()}

      {/* Charts */}
      {selectedView === 'combined' ? (
        // Selected Tests Chart
        <div style={{ height: `${height}px` }}>
          {selectedTests.length > 0 ? (
            <Line data={generateSelectedChartData()} options={chartOptions} />
          ) : (
            <div className='flex items-center justify-center h-full text-gray-500'>
              Select at least one test to view trends
            </div>
          )}
        </div>
      ) : selectedView === 'grouped' ? (
        // Medical Groups View
        <div className='space-y-6'>
          {Object.entries(medicalGroups).map(([groupName, group]) => {
            const chartData = generateGroupedChartData(groupName);
            if (!chartData) return null;

            return (
              <div
                key={groupName}
                className='border border-gray-200 rounded-lg p-4'
              >
                <h4 className='text-lg font-semibold text-gray-900 mb-2'>
                  {groupName}
                </h4>
                <p className='text-sm text-gray-600 mb-4'>
                  {group.description}
                </p>
                <div style={{ height: '300px' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Individual Charts
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {selectedTests.map((testCode) => {
            const chartData = generateIndividualChartData(testCode);
            if (!chartData) return null;

            return (
              <div
                key={testCode}
                className='border border-gray-200 rounded-lg p-4'
              >
                <h4 className='text-lg font-semibold text-gray-900 mb-3 flex items-center'>
                  <Activity
                    className='w-5 h-5 mr-2'
                    style={{
                      color: testColors[testCode as keyof typeof testColors],
                    }}
                  />
                  {trendData[testCode].metadata.name}
                </h4>
                <div style={{ height: '250px' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visit Timeline */}
      <div className='border-t border-gray-200 pt-4'>
        <h4 className='text-lg font-semibold text-gray-900 mb-3 flex items-center'>
          <Calendar className='w-5 h-5 mr-2 text-gray-600' />
          Visit Timeline
        </h4>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
          {visitContext.map((visit, index) => (
            <div
              key={index}
              className='bg-gray-50 rounded-lg p-3 border border-gray-200'
            >
              <div className='flex justify-between items-start'>
                <div>
                  <p className='font-medium text-gray-900'>
                    Visit {visit.visitNumber}
                  </p>
                  <p className='text-sm text-gray-600'>{visit.formattedDate}</p>
                </div>
                {visit.situation && (
                  <span className='text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded'>
                    {visit.situation.code}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
