"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Eye, Loader2 } from "lucide-react";
import { withAuth } from "@/components/auth/withAuth";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { getPrimaryRole } from "@/lib/utils/routing";
import { useAuthStore } from "@/store/auth";

function getStatusBadge(status: string) {
  if (status === "FULLY_APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Fully Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
      <Clock className="h-3.5 w-3.5" />
      Pending HR Review
    </span>
  );
}

function HRReviewListPage() {
  const { session } = useAuthStore();
  const role = getPrimaryRole(session?.user.roles ?? []);

  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.hr.getTeamAppraisals();
        if (!active) return;
        setAppraisals(response.data ?? []);
      } catch (err: any) {
        if (active)
          setError(
            err?.response?.data?.message || err?.message || "Failed to load",
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const pending = useMemo(
    () => appraisals.filter((a) => a.status === "HR_FINALIZED"),
    [appraisals],
  );
  const approved = useMemo(
    () => appraisals.filter((a) => a.status === "FULLY_APPROVED"),
    [appraisals],
  );

  if (loading) {
    return (
      <AppShell role={role}>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 text-text-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading HR review list...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  function AppraisalRow({
    appraisal,
    viewOnly,
  }: {
    appraisal: any;
    viewOnly: boolean;
  }) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-text-2">
            {appraisal.user?.department?.name ?? "Department"}
          </div>
          <div className="mt-1 font-semibold text-text">
            {appraisal.user?.firstName} {appraisal.user?.lastName}
          </div>
          <div className="mt-0.5 text-xs text-text-3">
            {appraisal.user?.email}
          </div>
          <div className="mt-1 text-xs text-text-3">
            Cycle: {appraisal.cycle?.name ?? "-"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(appraisal.status)}
          <Link
            href={`/hr-review/${appraisal.id}/review`}
            className={
              viewOnly
                ? "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text-2 transition hover:bg-surface-2"
                : "inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark"
            }
          >
            <Eye className="h-4 w-4" />
            {viewOnly ? "View" : "Review"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell role={role}>
      <PageHeader
        title="HR Appraisals"
        subtitle="Finalize appraisals that have completed committee review"
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-danger/20 bg-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {appraisals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg">
            <CheckCircle2 className="h-6 w-6 text-text-3" />
          </div>
          <p className="text-sm font-medium text-text">No appraisals yet</p>
          <p className="mt-1 text-sm text-text-2">
            Appraisals that complete committee review will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending HR review */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-text">
                Pending HR Review
              </h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {pending.length}
                </span>
              )}
            </div>
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-2">
                No appraisals pending HR review.
              </div>
            ) : (
              <div className="grid gap-4">
                {pending.map((appraisal) => (
                  <AppraisalRow
                    key={appraisal.id}
                    appraisal={appraisal}
                    viewOnly={false}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Fully approved */}
          {approved.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-text">
                  HR Review Submitted
                </h2>
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-text-3">
                  {approved.length}
                </span>
              </div>
              <p className="mb-4 text-sm text-text-2">
                These appraisals have been reviewed by HR and are pending super
                admin approval. They are read-only.
              </p>
              <div className="grid gap-4">
                {approved.map((appraisal) => (
                  <AppraisalRow
                    key={appraisal.id}
                    appraisal={appraisal}
                    viewOnly={true}
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

export default withAuth(HRReviewListPage, ["HR"]);
