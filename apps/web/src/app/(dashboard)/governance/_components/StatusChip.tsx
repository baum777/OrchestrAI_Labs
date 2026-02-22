"use client";

import { getStatusColor, getStatusLabel } from "../_lib/format";

interface StatusChipProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusChip({ status, size = "md" }: StatusChipProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  const colorClasses = {
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    red: "bg-red-100 text-red-800 border-red-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${sizeClasses[size]} ${colorClasses[color]}`}
    >
      <span
        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
          color === "green"
            ? "bg-green-500"
            : color === "yellow"
              ? "bg-yellow-500"
              : color === "red"
                ? "bg-red-500"
                : "bg-gray-500"
        }`}
      />
      {label}
    </span>
  );
}
