import type { PolicyViolationAdvice } from "@shared/types/governance";

interface AdvisorCardProps {
  advice: PolicyViolationAdvice;
  className?: string;
}

export function AdvisorCard({ advice, className = "" }: AdvisorCardProps) {
  const safetyLevelStyles = {
    info: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      icon: "ℹ️",
      iconBg: "bg-blue-100",
      titleColor: "text-blue-900",
      textColor: "text-blue-800",
    },
    warning: {
      border: "border-yellow-200",
      bg: "bg-yellow-50",
      icon: "⚠️",
      iconBg: "bg-yellow-100",
      titleColor: "text-yellow-900",
      textColor: "text-yellow-800",
    },
    critical: {
      border: "border-red-200",
      bg: "bg-red-50",
      icon: "🚨",
      iconBg: "bg-red-100",
      titleColor: "text-red-900",
      textColor: "text-red-800",
    },
  };

  const styles = safetyLevelStyles[advice.safetyLevel];

  return (
    <div
      className={`rounded-lg border-2 ${styles.border} ${styles.bg} p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center text-lg`}>
          {styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${styles.titleColor} mb-1`}>
            {advice.advisorTitle}
          </h3>
          <p className={`text-sm ${styles.textColor} mb-2`}>
            {advice.humanExplanation}
          </p>
          <div className={`text-xs ${styles.textColor} opacity-80`}>
            <strong>Nächster Schritt:</strong> {advice.remedyStep}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Code: <code className="font-mono">{advice.code}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

