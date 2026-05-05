"use client";

import { useEffect, useState } from "react";
import { Edit01, Trash01 } from "@untitledui/icons";
import { deleteUser, fetchAllUsers, type UserRecord } from "@/lib/api";
import { usePagedItems } from "@/lib/hooks/usePagedItems";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import UserFormDrawer from "@/components/drawers/UserFormDrawer";
import ConfirmModal from "@/components/modals/ConfirmModal";
import { Table, TableCard } from "@/components/application/table/table";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Badge } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

type Row = UserRecord & { rowKey: string };

export default function PartnersView() {
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitial, setDrawerInitial] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchAllUsers();
      const data = json.data;
      const list: UserRecord[] = Array.isArray(data)
        ? (data as UserRecord[])
        : Array.isArray((json as unknown as { Data?: UserRecord[] }).Data)
        ? ((json as unknown as { Data?: UserRecord[] }).Data as UserRecord[])
        : [];
      setUsers(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    try {
      await deleteUser(String(deleteTarget.id));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      alert((err as Error).message || "Delete failed.");
    }
  }

  const rows: Row[] = (users ?? []).map((u, i) => ({ ...u, rowKey: String(u.id ?? `idx-${i}`) }));
  const { page, setPage, totalPages, pagedItems, totalItems } = usePagedItems(rows, 10);

  return (
    <main className="view-host-mgmt">
      <div className="stations-menubar">
        <button
          type="button"
          className="stations-menubar-item"
          onClick={() => {
            setDrawerInitial(null);
            setDrawerOpen(true);
          }}
        >
          Add user
        </button>
      </div>

      <TableCard.Root>
        <TableCard.Header
          title="Users"
          badge={
            <Badge size="sm" color="brand" type="pill-color">
              {totalItems} {totalItems === 1 ? "user" : "users"}
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
          <p className="px-4 py-6 text-sm text-text-tertiary md:px-6">No users found.</p>
        ) : (
          <>
            <Table aria-label="Users" selectionMode="multiple">
              <Table.Header>
                <Table.Head id="id" label="ID" />
                <Table.Head id="username" label="Username" isRowHeader />
                <Table.Head id="type" label="Type" />
                <Table.Head id="created" label="Created" />
                <Table.Head id="updated" label="Updated" />
                <Table.Head id="stations" label="Stations" tooltip="Stations this user can manage." />
                <Table.Head id="actions" label="" />
              </Table.Header>

              <Table.Body items={pagedItems}>
                {(item) => {
                  const stationList = Array.isArray(item.stations) ? item.stations : [];
                  return (
                    <Table.Row id={item.rowKey}>
                      <Table.Cell className="font-mono text-text-tertiary">{String(item.id ?? "")}</Table.Cell>
                      <Table.Cell className="font-medium">{item.username ?? ""}</Table.Cell>
                      <Table.Cell>{item.type ?? ""}</Table.Cell>
                      <Table.Cell className="text-text-tertiary">{item.created_at ?? ""}</Table.Cell>
                      <Table.Cell className="text-text-tertiary">{item.updated_at ?? ""}</Table.Cell>
                      <Table.Cell>
                        {stationList.length === 0 ? (
                          <span className="text-text-quaternary">—</span>
                        ) : stationList.length === 1 ? (
                          <span>{stationList[0]}</span>
                        ) : (
                          <span className="hover-card-trigger">
                            {stationList.length} stations
                            <div className="hover-card-content">
                              <div className="hover-card-title">Stations</div>
                              <div className="hover-card-description">
                                {`This user has access to ${stationList.length} station${
                                  stationList.length !== 1 ? "s" : ""
                                }:`}
                              </div>
                              <div className="hover-card-stations">
                                {stationList.map((sid) => (
                                  <div key={sid} className="hover-card-station-item">
                                    {sid}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex justify-end gap-1">
                          <ButtonUtility
                            size="xs"
                            color="tertiary"
                            icon={Edit01}
                            tooltip="Edit"
                            onPress={() => {
                              setDrawerInitial(item);
                              setDrawerOpen(true);
                            }}
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
                  );
                }}
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

      <UserFormDrawer
        open={drawerOpen}
        initial={drawerInitial}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => load()}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={
          deleteTarget
            ? `Are you sure you want to delete user "${
                deleteTarget.username || deleteTarget.id
              }"?`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </main>
  );
}
