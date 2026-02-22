"use client";

import { getStatusColor } from "../_lib/format";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: string;
}

export function MetricCard({ title, value, subtitle, status }: MetricCardProps) {
  const color = status ? getStatusColor(status) : "gray";

  const borderClasses = {
    green: "border-l-4 border-l-green-500",
    yellow: "border-l-4 border-l-yellow-500",
    red: "border-l-4 border-l-red-500",
    gray: "border-l-4 border-l-gray-300",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-5 ${borderClasses[color]}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
