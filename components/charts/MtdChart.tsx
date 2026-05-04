"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  type Plugin,
} from "chart.js";
import type { RentMtdPayload, RentMtdRow } from "@/lib/api";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
);

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function dayOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseMoney(v: unknown): number {
  if (v == null || v === "") return 0;
  const num = parseFloat(String(v).replace(/[$,]/g, ""));
  return isNaN(num) ? 0 : num;
}

function parseMtdDate(dStr: string, fallbackYear: number, fallbackMonth: number): Date {
  if (!dStr || typeof dStr !== "string") return new Date(0);
  const trimmed = dStr.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }
  const comma = trimmed.indexOf(",");
  const firstPart = comma > 0 ? trimmed.slice(0, comma).trim() : trimmed;
  const yearPart = comma > 0 ? trimmed.slice(comma + 1).trim() : "";
  const year = yearPart ? parseInt(yearPart, 10) : fallbackYear;
  const spaceIdx = firstPart.indexOf(" ");
  const monthStr = spaceIdx > 0 ? firstPart.slice(0, spaceIdx).trim() : "";
  const day = spaceIdx > 0 ? parseInt(firstPart.slice(spaceIdx + 1).trim(), 10) : 1;
  let monthIndex = SHORT_MONTHS.indexOf(monthStr);
  if (monthIndex < 0) monthIndex = fallbackMonth;
  return new Date(year, monthIndex, day);
}

function escapeHtml(s: string) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

type Props = {
  payload: RentMtdPayload | null;
  rangeStart: Date;
  rangeEnd: Date;
  avgPerStation: number | null;
};

export default function MtdChart({ payload, rangeStart, rangeEnd, avgPerStation }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const summary = useMemo(() => {
    if (!payload || !payload.success || !Array.isArray(payload.data) || payload.data.length === 0) {
      return null;
    }
    const data = payload.data.slice();
    const totalMoney = data.reduce((sum, d) => sum + parseMoney(d.money), 0);
    const ref =
      (payload.ppositive != null ? Number(payload.ppositive) : 0) +
      (payload.pnegative != null ? Number(payload.pnegative) : 0);
    const pct = ref === 0 ? 0 : ((totalMoney - ref) / Math.abs(ref)) * 100;
    const pctStr = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
    const pctClass = pct >= 0 ? "mtd-chart-pct-positive" : "mtd-chart-pct-negative";
    const description = payload.range || payload.mtd || "";

    const now = new Date();
    const todayStr = SHORT_MONTHS[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
    const todayD = dayOnly(now);
    const rs = dayOnly(rangeStart);
    const re = dayOnly(rangeEnd);
    const todayInRange = todayD >= rs && todayD <= re;
    const todayRow = todayInRange ? data.find((d) => (d.date ?? "").trim() === todayStr) : null;
    const todayMoney =
      todayInRange && todayRow && todayRow.money != null
        ? String(todayRow.money)
        : todayInRange
        ? "$0"
        : "—";

    const sum = data.reduce((s, d) => s + parseMoney(d.money), 0);
    const dailyAvg = data.length > 0 ? Math.round(sum / data.length) : 0;
    const sameMonth =
      rangeStart.getFullYear() === rangeEnd.getFullYear() &&
      rangeStart.getMonth() === rangeEnd.getMonth();
    const dailyAvgTitle = sameMonth
      ? MONTH_NAMES[rangeStart.getMonth()] + " daily average"
      : "Period daily average";

    return {
      data,
      totalMoney,
      pctStr,
      pctClass,
      description,
      todayMoney,
      dailyAvg,
      dailyAvgTitle,
    };
  }, [payload, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!summary || !canvasRef.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const data = summary.data
      .slice()
      .sort(
        (a: RentMtdRow, b: RentMtdRow) =>
          parseMtdDate(a.date ?? "", new Date().getFullYear(), new Date().getMonth()).getTime() -
          parseMtdDate(b.date ?? "", new Date().getFullYear(), new Date().getMonth()).getTime(),
      );

    const labels = data.map((d) => {
      const dStr = (d.date ?? "").trim();
      if (/^\d{4}-\d{1,2}-\d{1,2}/.test(dStr)) {
        const parsed = parseMtdDate(dStr, new Date().getFullYear(), new Date().getMonth());
        return SHORT_MONTHS[parsed.getMonth()] + " " + parsed.getDate();
      }
      const comma = dStr.indexOf(",");
      return comma > 0 ? dStr.slice(0, comma).trim() : dStr;
    });

    const moneyValues = data.map((d) => parseMoney(d.money));
    const pmoneyValues = data.map((d) => parseMoney(d.pmoney));

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(0, 153, 255, 0.35)");
    gradient.addColorStop(1, "rgba(0, 153, 255, 0.05)");
    const grey = "#737373";

    const verticalLinePlugin: Plugin = {
      id: "mtdVerticalLine",
      afterDraw: (chart) => {
        const tooltip = chart.tooltip as unknown as
          | { _active?: { element?: { x: number } }[]; active?: { element?: { x: number } }[]; dataPoints?: { element?: { x: number } }[] }
          | undefined;
        const active =
          tooltip?._active ||
          tooltip?.active ||
          tooltip?.dataPoints?.map((p) => ({ element: p.element }));
        if (active && active.length && active[0].element) {
          const c = chart.ctx;
          const x = active[0].element.x;
          const yScale = chart.scales.y;
          const top = yScale ? yScale.top : chart.chartArea.top;
          const bottom = yScale ? yScale.bottom : chart.chartArea.bottom;
          c.save();
          c.setLineDash([6, 4]);
          c.strokeStyle = "rgba(115, 115, 115, 0.8)";
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(x, top);
          c.lineTo(x, bottom);
          c.stroke();
          c.restore();
        }
      },
    };

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const tooltipEl = tooltipRef.current;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      plugins: [verticalLinePlugin],
      data: {
        labels,
        datasets: [
          {
            label: "Rents",
            data: moneyValues,
            borderColor: "#0099FF",
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#0099FF",
            pointBorderColor: "#000",
            pointBorderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: "Previous month",
            data: pmoneyValues,
            borderColor: grey,
            backgroundColor: "transparent",
            fill: false,
            tension: 0.4,
            pointBackgroundColor: grey,
            pointBorderColor: "#000",
            pointBorderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            mode: "index",
            intersect: false,
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
              const row = data[i];
              if (!row) {
                el.classList.remove("visible");
                return;
              }
              const dateStr = (labels[i] || "").trim();
              const moneyStr = row.money != null && row.money !== "" ? String(row.money) : "$0";
              const pmoneyStr = row.pmoney != null && row.pmoney !== "" ? String(row.pmoney) : "$0";
              const moneyNum = parseMoney(moneyStr);
              const pmoneyNum = parseMoney(pmoneyStr);
              const ref = Math.abs(pmoneyNum);
              const pct = ref === 0 ? 0 : ((moneyNum - pmoneyNum) / ref) * 100;
              const pctStr = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
              const pctClass = pct >= 0 ? "chart-tooltip-pct-positive" : "chart-tooltip-pct-negative";
              let prevDateStr = dateStr;
              {
                const dStr = (row.date ?? "").trim();
                const comma = dStr.indexOf(",");
                const firstPart = comma > 0 ? dStr.slice(0, comma).trim() : dStr;
                const yearPart = comma > 0 ? dStr.slice(comma + 1).trim() : "";
                const now = new Date();
                const year = yearPart ? parseInt(yearPart, 10) : now.getFullYear();
                const spaceIdx = firstPart.indexOf(" ");
                const monthStr = spaceIdx > 0 ? firstPart.slice(0, spaceIdx).trim() : "";
                const day = spaceIdx > 0 ? parseInt(firstPart.slice(spaceIdx + 1).trim(), 10) : 1;
                let monthIndex = SHORT_MONTHS.indexOf(monthStr);
                if (monthIndex < 0) monthIndex = now.getMonth();
                const prev = new Date(year, monthIndex - 1, day);
                prevDateStr = SHORT_MONTHS[prev.getMonth()] + " " + prev.getDate();
              }
              el.innerHTML =
                '<div class="chart-tooltip-header">' +
                "<span>Net volume</span>" +
                '<span class="chart-tooltip-pct ' +
                pctClass +
                '">' +
                pctStr +
                "</span>" +
                "</div>" +
                '<div class="chart-tooltip-divider"></div>' +
                '<div class="chart-tooltip-body">' +
                '<div class="chart-tooltip-row">' +
                '<span class="chart-tooltip-square blue"></span>' +
                '<span class="chart-tooltip-date">' +
                escapeHtml(dateStr) +
                "</span>" +
                '<span class="chart-tooltip-value">' +
                escapeHtml(moneyStr) +
                "</span>" +
                "</div>" +
                '<div class="chart-tooltip-row">' +
                '<span class="chart-tooltip-square grey"></span>' +
                '<span class="chart-tooltip-date">' +
                escapeHtml(prevDateStr) +
                "</span>" +
                '<span class="chart-tooltip-value">' +
                escapeHtml(pmoneyStr) +
                "</span>" +
                "</div>" +
                "</div>";
              el.classList.add("visible");
              el.setAttribute("aria-hidden", "false");
              const wrap = el.parentElement;
              const canvas = context.chart.canvas as HTMLCanvasElement;
              if (wrap && canvas) {
                const rect = canvas.getBoundingClientRect();
                const wrapRect = wrap.getBoundingClientRect();
                const caretX = tp.caretX != null ? tp.caretX : tp.x;
                const caretY = tp.caretY != null ? tp.caretY : tp.y;
                const left = rect.left - wrapRect.left + caretX;
                const top = rect.top - wrapRect.top + caretY;
                const w = el.offsetWidth || 180;
                const h = el.offsetHeight || 80;
                el.style.left =
                  Math.max(8, Math.min(left - w / 2, wrap.offsetWidth - w - 8)) + "px";
                el.style.top = top - h - 10 + "px";
              }
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#737373", maxRotation: 0, maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: true,
            grid: { display: false },
            ticks: { display: false, stepSize: 20 },
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
  }, [summary]);

  if (!summary) return null;

  return (
    <>
      <div className="mtd-chart-card">
        <div className="mtd-chart-title">
          Revenue
          <div className="mtd-chart-amount-wrap">
            <span className="mtd-chart-amount">${summary.totalMoney.toFixed(0)}</span>
            <span className={"mtd-chart-pct " + summary.pctClass}>{summary.pctStr}</span>
          </div>
        </div>
        <div className="mtd-chart-description">{summary.description}</div>
        <div className="mtd-chart-canvas-wrap">
          <canvas ref={canvasRef} aria-label="Revenue chart" />
          <div ref={tooltipRef} className="chart-tooltip-custom" aria-hidden="true" />
        </div>
      </div>
      <div className="mtd-stats-row">
        <div className="mtd-mini-card">
          <div className="mtd-mini-card-title">Today</div>
          <div className="mtd-mini-card-amount">{summary.todayMoney}</div>
        </div>
        <div className="mtd-mini-card">
          <div className="mtd-mini-card-title">{summary.dailyAvgTitle}</div>
          <div className="mtd-mini-card-amount">${summary.dailyAvg}</div>
        </div>
        <div className="mtd-mini-card">
          <div className="mtd-mini-card-title">Avg per station</div>
          <div className="mtd-mini-card-amount">
            {avgPerStation != null && !isNaN(avgPerStation) ? "$" + Math.round(avgPerStation) : "—"}
          </div>
        </div>
      </div>
    </>
  );
}
