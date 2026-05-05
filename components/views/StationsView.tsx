"use client";

import { useEffect, useState } from "react";
import { Edit01, Trash01, Zap } from "@untitledui/icons";
import {
  deleteStation,
  fetchAllStations,
  popAll,
  stationsFromApiJson,
  stationMissingAddressOrStripe,
  type StationRecord,
} from "@/lib/api";
import { usePagedItems } from "@/lib/hooks/usePagedItems";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import StationFormDrawer from "@/components/drawers/StationFormDrawer";
import ConfirmModal from "@/components/modals/ConfirmModal";
import { Table, TableCard } from "@/components/application/table/table";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

function normalizeWeekdayHours(row: StationRecord): StationRecord {
  if (!row || typeof row !== "object") return row;
  const out: StationRecord = { ...row };
  const wh = out.weekday_hours;
  if (wh == null || wh === "") {
    out.weekday_hours = null;
  } else if (typeof wh === "string") {
    try {
      out.weekday_hours = JSON.parse(wh);
    } catch {
      out.weekday_hours = null;
    }
  }
  return out;
}

function stationFieldValueForExport(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

function stationsRowsForXlsx(list: StationRecord[]): Record<string, string | number | boolean>[] {
  const rows = (list || []).map((row) => (row && typeof row === "object" ? normalizeWeekdayHours(row) : row));
  const keySet: Record<string, true> = {};
  rows.forEach((row) => {
    if (row && typeof row === "object") {
      Object.keys(row).forEach((k) => {
        keySet[k] = true;
      });
    }
  });
  const keys = Object.keys(keySet).sort();
  return rows.map((row) => {
    const o: Record<string, string | number | boolean> = {};
    keys.forEach((k) => {
      if (!row || typeof row !== "object") {
        o[k] = "";
        return;
      }
      o[k] = stationFieldValueForExport((row as Record<string, unknown>)[k]);
    });
    return o;
  });
}

type Row = StationRecord & { rowKey: string };

export default function StationsView() {
  const [stations, setStations] = useState<StationRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitial, setDrawerInitial] = useState<StationRecord | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<StationRecord | null>(null);
  const [dispenseTarget, setDispenseTarget] = useState<StationRecord | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchAllStations();
      setStations(stationsFromApiJson(json));
    } catch (e) {
      console.error(e);
      setError("Failed to load stations. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setDrawerInitial(null);
    setDrawerOpen(true);
  }

  function openEdit(s: StationRecord) {
    setDrawerInitial(s);
    setDrawerOpen(true);
  }

  async function handleDispense() {
    if (!dispenseTarget?.id) return;
    try {
      await popAll(String(dispenseTarget.id));
      setDispenseTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message
          ? (err as Error).message
          : "Failed to dispense powerbanks. Please try again.",
      );
      setDispenseTarget(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    try {
      await deleteStation(String(deleteTarget.id));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      alert((err as Error).message || "Delete failed.");
    }
  }

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      const xlsx = await import("xlsx");
      const json = await fetchAllStations();
      const list = stationsFromApiJson(json);
      const rows = stationsRowsForXlsx(list);
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(rows.length ? rows : [{}]);
      xlsx.utils.book_append_sheet(wb, ws, "Stations");
      const now = new Date();
      const y = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const da = String(now.getDate()).padStart(2, "0");
      xlsx.writeFile(wb, `cuub-stations-${y}-${mo}-${da}.xlsx`);
    } catch (e) {
      console.error(e);
      setError(
        (e as Error)?.message
          ? (e as Error).message
          : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  const rows: Row[] = (stations ?? []).map((s, i) => ({ ...s, rowKey: String(s.id ?? `idx-${i}`) }));
  const { page, setPage, totalPages, pagedItems, totalItems } = usePagedItems(rows, 10);

  return (
    <main className="view-station-mgmt">
      <div className="stations-menubar">
        <button
          type="button"
          className="stations-menubar-item"
          onClick={handleExport}
          disabled={exporting}
          aria-busy={exporting || undefined}
        >
          {exporting ? "Exporting…" : "Export"}
        </button>
        <button type="button" className="stations-menubar-item" onClick={openAdd}>
          Add station
        </button>
        <a
          href="https://map.cuub.tech"
          className="stations-menubar-item a-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Map
        </a>
      </div>

      {warning ? (
        <div
          className="error"
          id="mgmtError"
          style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}
        >
          {warning}
        </div>
      ) : null}

      <TableCard.Root>
        <TableCard.Header
          title="Stations"
          badge={
            <Badge size="sm" color="brand" type="pill-color">
              {totalItems} {totalItems === 1 ? "station" : "stations"}
            </Badge>
          }
        />

        {loading ? (
          <div className="px-4 py-3 md:px-6 md:py-4">
            <SkeletonTable rows={5} />
          </div>
        ) : error ? (
          <div className="error" style={{ margin: "0.75rem" }}>{error}</div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-tertiary md:px-6">No stations found.</p>
        ) : (
          <>
            <Table aria-label="Stations" selectionMode="multiple">
              <Table.Header>
                <Table.Head id="status" label="Status" className="w-24" />
                <Table.Head id="title" label="Title" isRowHeader className="w-full" />
                <Table.Head id="id" label="ID" />
                <Table.Head id="filled" label="Filled" tooltip="Number of slots that currently hold a powerbank." />
                <Table.Head id="open" label="Open" tooltip="Number of empty slots available for returns." />
                <Table.Head id="actions" label="" />
              </Table.Header>

              <Table.Body items={pagedItems}>
                {(item) => (
                  <Table.Row id={item.rowKey}>
                    <Table.Cell>
                      <BadgeWithDot
                        size="sm"
                        type="pill-color"
                        color={item.online === true ? "success" : "error"}
                      >
                        {item.online === true ? "Online" : "Offline"}
                      </BadgeWithDot>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        {stationMissingAddressOrStripe(item) ? (
                          <span
                            className="text-fg-error-primary font-bold"
                            aria-label="Missing address or Stripe ID"
                            title="Missing address or Stripe ID"
                          >
                            !
                          </span>
                        ) : null}
                        <span className="font-semibold text-text-primary">{item.title ?? ""}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="font-mono text-text-tertiary">{String(item.id ?? "")}</Table.Cell>
                    <Table.Cell>{item.filled_slots != null ? item.filled_slots : "—"}</Table.Cell>
                    <Table.Cell>{item.open_slots != null ? item.open_slots : "—"}</Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end gap-1">
                        <ButtonUtility
                          size="xs"
                          color="tertiary"
                          icon={Zap}
                          tooltip="Dispense all powerbanks"
                          onPress={() => setDispenseTarget(item)}
                        />
                        <ButtonUtility
                          size="xs"
                          color="tertiary"
                          icon={Edit01}
                          tooltip="Edit"
                          onPress={() => openEdit(item)}
                        />
                        <ButtonUtility
                          size="xs"
                          color="tertiary"
                          icon={Trash01}
                          tooltip="Delete"
                          onPress={() => setDeleteTarget(item)}
                        />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>

            <PaginationPageMinimalCenter
              page={page}
              total={totalPages}
              onPageChange={setPage}
              className="px-4 py-3 md:px-6 md:pt-3 md:pb-4"
            />
          </>
        )}
      </TableCard.Root>

      <StationFormDrawer
        open={drawerOpen}
        initial={drawerInitial}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => load()}
        onWarning={(msg) => setWarning(msg)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete station"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title || deleteTarget.id}"?`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ConfirmModal
        open={Boolean(dispenseTarget)}
        title="Dispense Powerbanks"
        message={
          dispenseTarget
            ? `Are you sure you want to dispense all batteries at "${
                dispenseTarget.title || dispenseTarget.id
              }"?`
            : ""
        }
        confirmLabel="Dispense"
        onCancel={() => setDispenseTarget(null)}
        onConfirm={handleDispense}
      />
    </main>
  );
}
