"use client";

import { useEffect, useState } from "react";
import { deleteUser, fetchAllUsers, type UserRecord } from "@/lib/api";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import UserFormDrawer from "@/components/drawers/UserFormDrawer";
import ConfirmModal from "@/components/modals/ConfirmModal";

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
      {loading ? <SkeletonTable rows={5} /> : null}
      {error ? <div className="error">{error}</div> : null}
      {!loading && users ? (
        <div id="hostMgmtList">
          {users.length === 0 ? (
            <p style={{ color: "#a3a3a3" }}>No users found.</p>
          ) : (
            <table className="station-mgmt-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Stations</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const stationList = Array.isArray(u.stations) ? u.stations : [];
                  return (
                    <tr key={String(u.id)}>
                      <td>{String(u.id ?? "")}</td>
                      <td>{u.username ?? ""}</td>
                      <td>{u.type ?? ""}</td>
                      <td>{u.created_at ?? ""}</td>
                      <td>{u.updated_at ?? ""}</td>
                      <td>
                        {stationList.length === 0 ? (
                          "—"
                        ) : stationList.length === 1 ? (
                          stationList[0]
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
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => {
                              setDrawerInitial(u);
                              setDrawerOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => setDeleteTarget(u)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

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
