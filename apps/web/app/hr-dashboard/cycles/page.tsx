"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  Pause,
  Play,
  Plus,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { withAuth } from "@/components/auth/withAuth";
import { api, type HrCycleSummary } from "@/lib/api";
import { getPrimaryRole } from "@/lib/utils/routing";
import { useAuthStore } from "@/store/auth";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function HrCyclesPage() {
  const { session } = useAuthStore();
  const role = getPrimaryRole(session?.user.roles ?? []);

  const [cycles, setCycles] = useState<HrCycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCycle, setNewCycle] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });

  async function loadCycles() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.hr.getCycles();
      setCycles(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load cycles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCycles();
  }, []);

  async function toggleActive(cycle: HrCycleSummary) {
    try {
      setToggling(cycle.id);
      setError(null);
      await api.hr.updateCycle(cycle.id, { isActive: !cycle.isActive });
      await loadCycles();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update cycle");
    } finally {
      setToggling(null);
    }
  }

  async function handleCreate() {
    if (!newCycle.name.trim() || !newCycle.startDate || !newCycle.endDate) return;
    try {
      setSaving(true);
      setError(null);
      await api.hr.createCycle({
        name: newCycle.name.trim(),
        startDate: newCycle.startDate,
        endDate: newCycle.endDate,
        isActive: newCycle.isActive,
      });
      setNewCycle({ name: "", startDate: "", endDate: "", isActive: false });
      setShowCreate(false);
      await loadCycles();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to create cycle");
    } finally {
      setSaving(false);
    }
  }

  const activeCycles = cycles.filter((c) => c.isActive);
  const inactiveCycles = cycles.filter((c) => !c.isActive);

  return (
    <AppShell role={role}>
      <PageHeader
        title="Appraisal Cycles"
        subtitle="Manage appraisal cycles — enable or pause form filling for each cycle."
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-text-inv shadow-sm transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            New Cycle
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-danger/20 bg-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Info banner about join-date windows */}
      <div className="mb-6 rounded-2xl border border-brand/20 bg-brand-light/30 p-4 text-sm">
        <p className="font-medium text-brand">Join-date based access windows</p>
        <p className="mt-1 text-text-2">
          Employees joining <strong>January – June</strong>: appraisal form opens in{" "}
          <strong>June</strong>, closes end of <strong>July</strong>.
          <br />
          Employees joining <strong>July – December</strong>: appraisal form opens in{" "}
          <strong>December</strong>, closes end of <strong>January</strong>.
          <br />
          When a cycle is <strong>active</strong>, employees within their window can fill the form. Pausing a cycle closes access for everyone.
        </p>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-2xl border border-brand/30 bg-brand-light/20 p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-text">Create New Cycle</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label htmlFor="new-cycle-name" className="mb-1 block text-xs font-medium text-text-3">
                Cycle Name *
              </label>
              <input
                id="new-cycle-name"
                type="text"
                value={newCycle.name}
                onChange={(e) => setNewCycle((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. AY 2025-26 (Jan-Jun)"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-cycle-start" className="mb-1 block text-xs font-medium text-text-3">
                Start Date *
              </label>
              <input
                id="new-cycle-start"
                type="date"
                value={newCycle.startDate}
                onChange={(e) => setNewCycle((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-cycle-end" className="mb-1 block text-xs font-medium text-text-3">
                End Date *
              </label>
              <input
                id="new-cycle-end"
                type="date"
                value={newCycle.endDate}
                onChange={(e) => setNewCycle((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-brand focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="new-cycle-active"
              type="checkbox"
              checked={newCycle.isActive}
              onChange={(e) => setNewCycle((p) => ({ ...p, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-brand"
            />
            <label htmlFor="new-cycle-active" className="text-sm text-text">
              Enable form filling immediately
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving || !newCycle.name.trim() || !newCycle.startDate || !newCycle.endDate}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-text-inv shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewCycle({ name: "", startDate: "", endDate: "", isActive: false });
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text transition hover:bg-surface-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 text-text-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading cycles...</span>
          </div>
        </div>
      ) : cycles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-text-3" />
          <p className="font-medium text-text">No cycles yet</p>
          <p className="mt-1 text-sm text-text-2">
            Create your first appraisal cycle to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeCycles.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-success">
                Active — Form Filling Open
              </h2>
              <div className="space-y-3">
                {activeCycles.map((cycle) => (
                  <CycleCard
                    key={cycle.id}
                    cycle={cycle}
                    toggling={toggling}
                    onToggle={toggleActive}
                  />
                ))}
              </div>
            </section>
          )}

          {inactiveCycles.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-3">
                Paused / Inactive
              </h2>
              <div className="space-y-3">
                {inactiveCycles.map((cycle) => (
                  <CycleCard
                    key={cycle.id}
                    cycle={cycle}
                    toggling={toggling}
                    onToggle={toggleActive}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function CycleCard({
  cycle,
  toggling,
  onToggle,
}: {
  cycle: HrCycleSummary;
  toggling: string | null;
  onToggle: (c: HrCycleSummary) => Promise<void>;
}) {
  const isLoading = toggling === cycle.id;

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition ${
        cycle.isActive
          ? "border-success/30 bg-success-bg/20"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
              cycle.isActive ? "bg-success" : "bg-text-3"
            }`}
          />
          <div>
            <p className="font-semibold text-text">{cycle.name}</p>
            <p className="mt-0.5 text-xs text-text-2">
              {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
            </p>
            <p className="mt-1 text-xs text-text-3">
              {cycle._count?.appraisals ?? 0} appraisals in this cycle
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              cycle.isActive
                ? "bg-success-bg text-success"
                : "bg-surface-2 text-text-2"
            }`}
          >
            {cycle.isActive ? "Active" : "Paused"}
          </span>
          <button
            type="button"
            onClick={() => void onToggle(cycle)}
            disabled={isLoading}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-60 ${
              cycle.isActive
                ? "border border-border bg-surface text-text hover:bg-surface-2"
                : "bg-brand text-text-inv shadow-sm hover:bg-brand-dark"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : cycle.isActive ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {cycle.isActive ? "Pause" : "Enable"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default withAuth(HrCyclesPage, ["HR", "ADMIN", "SUPER_ADMIN"]);
