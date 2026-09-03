"use client";

import { Wallet, Clock, TrendingUp } from "lucide-react";

interface FeesSnapshotCardsProps {
  feesCollected: number;
  pendingCollection: number;
  expectedRevenue: number;
  feesCollectedLabel?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FeesSnapshotCards({
  feesCollected,
  pendingCollection,
  expectedRevenue,
  feesCollectedLabel = "this month",
}: FeesSnapshotCardsProps) {
  const cards = [
    {
      label: "Expected Revenue",
      value: formatCurrency(expectedRevenue),
      context: "per month",
      icon: TrendingUp,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      label: "Fees Collected",
      value: formatCurrency(feesCollected),
      context: feesCollectedLabel,
      icon: Wallet,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      label: "Pending to Collect",
      value: formatCurrency(pendingCollection),
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${card.iconBg}`}
              >
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {card.value}
                  {card.context && (
                    <span className="ml-2 text-sm font-normal text-emerald-600">
                      {card.context}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
