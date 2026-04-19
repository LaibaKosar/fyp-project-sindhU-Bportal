import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer
} from 'recharts'

// This component is dynamically imported to prevent hook call issues
const ComplianceChart = ({ filteredData, yAxisDomain, formatXAxisLabel, CustomTooltip, isClientReady, isAnimationActive = false }) => {
  // Only render ResponsiveContainer when client is ready to prevent hook errors
  if (!isClientReady) {
    return (
      <BarChart
        width={500}
        height={300}
        data={filteredData}
        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
      >
      <CartesianGrid 
        strokeDasharray="3 3" 
        stroke="#ffffff10" 
        vertical={false}
        opacity={0.3}
      />
      <XAxis
        dataKey="name"
        stroke="#94a3b8"
        fontSize={11}
        tickLine={false}
        angle={-25}
        textAnchor="end"
        height={60}
        interval={0}
        dx={-10}
        dy={10}
        tickFormatter={formatXAxisLabel}
      />
      <YAxis
        stroke="#94a3b8"
        fontSize={11}
        tickLine={false}
        domain={yAxisDomain}
        label={{
          value: 'Ratio (:1)',
          angle: -90,
          position: 'insideLeft',
          style: { textAnchor: 'middle', fill: '#94a3b8' },
        }}
      />
      <Tooltip content={<CustomTooltip />} />
      {/* Reference line for Social Science threshold (30:1) */}
      <ReferenceLine
        y={30}
        stroke="#ef4444"
        strokeWidth={2}
        strokeDasharray="5 5"
        label={{
          value: 'Social Science Max (30:1)',
          position: 'right',
          fill: '#ef4444',
          fontSize: 11,
          offset: 5
        }}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))'
        }}
      />
      {/* Reference line for Science threshold (20:1) */}
      <ReferenceLine
        y={20}
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="5 5"
        label={{
          value: 'Science Max (20:1)',
          position: 'right',
          fill: '#f59e0b',
          fontSize: 11,
          offset: 5
        }}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))'
        }}
      />
      <Bar
        dataKey="ratio"
        name="HEC ratio by department"
        radius={[8, 8, 0, 0]}
        legendType="square"
        barSize={60}
        isAnimationActive={isAnimationActive}
      >
        {filteredData.map((entry, index) => {
          const isCompliant = entry.ratio <= entry.threshold
          return (
            <Cell
              key={`cell-${index}`}
              fill={isCompliant ? '#22d3ee' : '#ef4444'}
            />
          )
        })}
      </Bar>
    </BarChart>
    )
  }

  // Render with ResponsiveContainer when client is ready
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={filteredData}
        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
      >
      <CartesianGrid 
        strokeDasharray="3 3" 
        stroke="#ffffff10" 
        vertical={false}
        opacity={0.3}
      />
      <XAxis
        dataKey="name"
        stroke="#94a3b8"
        fontSize={11}
        tickLine={false}
        angle={-25}
        textAnchor="end"
        height={60}
        interval={0}
        dx={-10}
        dy={10}
        tickFormatter={formatXAxisLabel}
      />
      <YAxis
        stroke="#94a3b8"
        fontSize={11}
        tickLine={false}
        domain={yAxisDomain}
        label={{
          value: 'Ratio (:1)',
          angle: -90,
          position: 'insideLeft',
          style: { textAnchor: 'middle', fill: '#94a3b8' },
        }}
      />
      <Tooltip content={<CustomTooltip />} />
      {/* Reference line for Social Science threshold (30:1) */}
      <ReferenceLine
        y={30}
        stroke="#ef4444"
        strokeWidth={2}
        strokeDasharray="5 5"
        label={{
          value: 'Social Science Max (30:1)',
          position: 'right',
          fill: '#ef4444',
          fontSize: 11,
          offset: 5
        }}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))'
        }}
      />
      {/* Reference line for Science threshold (20:1) */}
      <ReferenceLine
        y={20}
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="5 5"
        label={{
          value: 'Science Max (20:1)',
          position: 'right',
          fill: '#f59e0b',
          fontSize: 11,
          offset: 5
        }}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))'
        }}
      />
      <Bar
        dataKey="ratio"
        name="HEC ratio by department"
        radius={[8, 8, 0, 0]}
        legendType="square"
        barSize={60}
        isAnimationActive={isAnimationActive}
      >
        {filteredData.map((entry, index) => {
          const isCompliant = entry.ratio <= entry.threshold
          return (
            <Cell
              key={`cell-${index}`}
              fill={isCompliant ? '#22d3ee' : '#ef4444'}
            />
          )
        })}
      </Bar>
    </BarChart>
    </ResponsiveContainer>
  )
}

export default ComplianceChart
