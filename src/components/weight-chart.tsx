"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Scale } from "lucide-react";

interface WeightPoint {
  date: string;
  weight: number;
}

interface Props {
  data: WeightPoint[];
  currentWeight?: number | null;
}

export function WeightChart({ data, currentWeight }: Props) {
  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <Scale className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Not enough weight data to show a trend.</p>
        <p className="text-gray-400 text-xs mt-1">
          Include weight in health logs or update it on the pet&apos;s profile.
        </p>
        {currentWeight && (
          <p className="mt-3 text-sm font-medium text-gray-700">
            Current: <span className="text-emerald-600">{currentWeight} kg</span>
          </p>
        )}
      </div>
    );
  }

  const min = Math.min(...data.map((d) => d.weight));
  const max = Math.max(...data.map((d) => d.weight));
  const padding = (max - min) * 0.15 || 0.5;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Weight trend</h3>
        </div>
        <span className="text-xs text-gray-400">{data.length} data points</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <YAxis domain={[min - padding, max + padding]} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} unit=" kg" />
          <Tooltip
            contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}
            formatter={(value) => [`${value} kg`, "Weight"]}
          />
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#weightGrad)"
            dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#059669" }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex justify-between mt-3 text-xs text-gray-400">
        <span>Min: {min} kg</span>
        <span>Max: {max} kg</span>
        <span>Latest: {data[data.length - 1]?.weight} kg</span>
      </div>
    </div>
  );
}
