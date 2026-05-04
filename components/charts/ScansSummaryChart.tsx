"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const SCANS_BAR_GRADIENTS: [string, string][] = [
  ["#EB641D", "#EB641D"],
  ["#23B3FA", "#1F65E0"],
  ["#DEA1EC", "#9118A7"],
  ["#FFD45B", "#D68909"],
];
const SCANS_TYPE_TO_GRADIENT_INDEX: Record<string, number> = {
  yellow: 3,
  blue: 1,
  purple: 2,
  orange: 0,
};

export function getScansGradientIndexForType(typeName: string | null | undefined): number {
  if (typeName == null || typeName === "") return 0;
  const key = String(typeName).toLowerCase().trim();
  return SCANS_TYPE_TO_GRADIENT_INDEX[key] ?? 0;
}

export function getScansTypeColor(typeName: string | null | undefined): string {
  return SCANS_BAR_GRADIENTS[getScansGradientIndexForType(typeName)][0];
}

function escapeHtml(s: string) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

export type ScansTypeCount = { type: string; count: number };

type Props = { typeCounts: ScansTypeCount[]; total: number };

export default function ScansSummaryChart({ typeCounts, total }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || typeCounts.length === 0) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }
    const labels = typeCounts.map((x) => x.type);
    const counts = typeCounts.map((x) => x.count);

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const tooltipEl = tooltipRef.current;

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Scans",
            data: counts,
            backgroundColor: (context) => {
              const chart = context.chart;
              const ctx = chart.ctx;
              const chartArea = chart.chartArea;
              if (!chartArea) return "#262626";
              const i = context.dataIndex;
              const typeName = labels[i];
              const idx = getScansGradientIndexForType(typeName);
              const c = SCANS_BAR_GRADIENTS[idx];
              const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, c[0]);
              g.addColorStop(1, c[1]);
              return g;
            },
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (context) => {
              const el = tooltipEl;
              if (!el) return;
              const tp = context.tooltip;
              if (tp.opacity === 0) {
                el.classList.remove("visible");
                el.setAttribute("aria-hidden", "true");
                return;
              }
              const i = tp.dataPoints && tp.dataPoints[0] ? tp.dataPoints[0].dataIndex : 0;
              const type = labels[i] || "Unknown";
              const count = counts[i] || 0;
              const colorIdx = getScansGradientIndexForType(type);
              const barColor = SCANS_BAR_GRADIENTS[colorIdx][0];
              el.innerHTML =
                '<div class="chart-tooltip-header">' +
                '<span class="chart-tooltip-type-with-color"><span class="chart-tooltip-square" style="background:' +
                barColor +
                '"></span>' +
                escapeHtml(type) +
                "</span>" +
                "</div>" +
                '<div class="chart-tooltip-divider"></div>' +
                '<div class="chart-tooltip-body">' +
                '<div class="chart-tooltip-row">' +
                '<span class="chart-tooltip-value">' +
                count +
                " scans</span>" +
                "</div>" +
                "</div>";
              el.classList.add("visible");
              el.setAttribute("aria-hidden", "false");
              const wrap = el.parentElement;
              const canvasEl = context.chart.canvas as HTMLCanvasElement;
              if (wrap && canvasEl) {
                const rect = canvasEl.getBoundingClientRect();
                const wrapRect = wrap.getBoundingClientRect();
                const caretX = tp.caretX != null ? tp.caretX : tp.x;
                const caretY = tp.caretY != null ? tp.caretY : tp.y;
                const left = rect.left - wrapRect.left + caretX;
                const w = el.offsetWidth || 180;
                const h = el.offsetHeight || 80;
                const meta = context.chart.getDatasetMeta(0);
                const bar = meta && meta.data[i];
                const barCenterY = bar
                  ? ((bar as unknown as { y: number; base: number }).y +
                      (bar as unknown as { y: number; base: number }).base) /
                    2
                  : caretY;
                const topPos = rect.top - wrapRect.top + barCenterY;
                el.style.left =
                  Math.max(8, Math.min(left - w / 2, wrap.offsetWidth - w - 8)) + "px";
                el.style.top = topPos - h / 2 + "px";
              }
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#737373", maxRotation: 45, maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: true,
            grid: { display: false },
            ticks: { color: "#737373" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [typeCounts]);

  return (
    <div className="scans-summary">
      <div className="scans-summary-total">
        <span className="label">Total Scans</span>
        <span className="value">{total}</span>
      </div>
      <div className="scans-summary-chart-wrap">
        <canvas ref={canvasRef} aria-label="Scans by type" />
        <div ref={tooltipRef} className="chart-tooltip-custom" aria-hidden="true" />
      </div>
    </div>
  );
}
