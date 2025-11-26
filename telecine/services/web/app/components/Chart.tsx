import { useState } from "react";
import {
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Legend,
  Tooltip,
} from "recharts";

export const Chart = ({
  groupedData,
  dateRange,
  xKey,
  yKey,
  zKey,
}: {
  groupedData: {
    date: string;
    Renders: number;
    SuccessfulRenders?: number;
  }[];
  dateRange: string;
  xKey: string;
  yKey: string;
  zKey?: string;
}) => {
  const formatXAxis = (tickItem: string) => {
    if (dateRange === "today" || dateRange === "yesterday") {
      return tickItem;
    }
    return new Date(tickItem).toLocaleDateString();
  };

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClick = (data: { date: string; Renders: number }) => {
    const index = groupedData.findIndex((el) => el.date === data.date);
    setActiveIndex(index);
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white shadow-lg rounded-md p-2">
          <p className="text-gray-900 font-medium flex items-center">
            {formatXAxis(payload[0].payload.date)} : {payload[0].value} Renders
            {zKey && payload[1] && (
              <span className="ml-2 text-mantins-500">
                <span className="text-gray-500">|</span> {payload[1].value}{" "}
                {zKey}
              </span>
            )}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={groupedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 10,
        }}
      >
        <XAxis dataKey={xKey} scale="point" padding={{ left: 50, right: 30 }} />
        <YAxis />
        <Legend />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          onClick={handleClick}
          dataKey={yKey}
          barSize={40}
          fill="#22292F"
          radius={[6, 6, 0, 0]}
          animationDuration={600}
        >
          {groupedData.map((_entry, index) => (
            <Cell
              cursor="pointer"
              fill={index === activeIndex ? "#52427F" : "#22292F"}
              key={`cell-${index}`}
            />
          ))}
        </Bar>
        {zKey && (
          <Bar
            dataKey={zKey}
            barSize={40}
            fill="#61a146"
            radius={[6, 6, 0, 0]}
            animationDuration={600}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};
