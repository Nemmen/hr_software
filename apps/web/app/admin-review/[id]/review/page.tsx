"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import { withAuth } from "@/components/auth/withAuth";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui";
import { api } from "@/lib/api";
import { getPrimaryRole } from "@/lib/utils/routing";
import { useAuthStore } from "@/store/auth";

type ReviewItem = {
  id: string;
  criterionKey: string;
  heading: string;
  selectedValue: string;
  selectedLabel: string;
  facultyRemarks: string | null;
  facultyPoints: number;
  hodApprovedPoints: number;
  adminApprovedPoints: number | null;
  adminRemark: string;
  evidence: Array<{
    url?: string;
    viewUrl?: string | null;
    directUrl?: string | null;
    fileName?: string;
  }> | null;
};

type RequestDetail = {
  id: string;
  status: string;
  submittedAt?: string | null;
  user: { firstName: string; lastName: string; email: string };
  cycle: { name: string };
  items: ReviewItem[];
  finalScore: number | null;
  finalPercent: number | null;
  hodOverallRemark: string;
  adminRemark: string;
};

type ItemState = {
  approvedPoints: number;
  remark: string;
};

function AdminReviewDetail() {
  const { session } = useAuthStore();
  const role = getPrimaryRole(session?.user.roles ?? []);
  const params = useParams();
  const router = useRouter();
  const appraisalId = params.id as string;

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [itemState, setItemState] = useState<Record<string, ItemState>>({});
  const [overallRemark, setOverallRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.adminReview.getById(appraisalId);
        if (!active) return;

        const data = res.data as RequestDetail;
        setDetail(data);
        setOverallRemark(
          typeof (res.data as any).adminRemark === "string"
            ? (res.data as any).adminRemark
            : "",
        );

        const initial: Record<string, ItemState> = {};
        for (const item of data.items) {
          initial[item.id] = {
            approvedPoints: item.adminApprovedPoints ?? item.hodApprovedPoints,
            remark: item.adminRemark ?? "",
          };
        }
        setItemState(initial);
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || err?.message || "Failed to load appraisal");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [appraisalId]);

  const totalApproved = useMemo(
    () => Object.values(itemState).reduce((sum, s) => sum + s.approvedPoints, 0),
    [itemState],
  );

  const isEditable = detail?.status === "ADMIN_REVIEW";

  async function handleSubmit() {
    if (!detail || !isEditable) return;
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const items = detail.items.map((item) => ({
        itemId: item.id,
        approvedPoints: itemState[item.id]?.approvedPoints ?? item.hodApprovedPoints,
        remark: itemState[item.id]?.remark?.trim() || undefined,
      }));

      await api.adminReview.submitReview(appraisalId, { items, overallRemark: overallRemark.trim() || undefined });
      setSuccess("Appraisal forwarded to HR successfully.");
      router.push("/admin-review");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    try {
      setRejecting(true);
      setError(null);
      await api.adminReview.rejectAppraisal(appraisalId, rejectReason.trim());
      setRejectDialogOpen(false);
      setSuccess("Appraisal rejected.");
      router.push("/admin-review");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to reject");
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return (
      <AppShell role={role}>
        <PageHeader title="Admin Review" subtitle="Loading..." />
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-text-2 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading appraisal details...</span>
        </div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell role={role}>
        <PageHeader title="Admin Review" subtitle="Not found" />
        <div className="rounded-2xl border border-danger/20 bg-danger-bg p-4 text-sm text-danger">
          {error ?? "Appraisal not found"}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role}>
      <PageHeader
        title={`Admin Review — ${detail.user.firstName} ${detail.user.lastName}`}
        subtitle={`Cycle: ${detail.cycle.name} · Level 2 Review`}
        actions={
          <Link
            href="/admin-review"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text transition hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-danger/20 bg-danger-bg p-4 text-sm text-danger">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-2xl border border-success/20 bg-success-bg p-4 text-sm text-success">{success}</div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Faculty</p>
          <p className="mt-1 font-semibold text-text">{detail.user.firstName} {detail.user.lastName}</p>
          <p className="text-xs text-text-3">{detail.user.email}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3">HOD Score</p>
          <p className="mt-1 font-display text-2xl font-bold text-text">{detail.finalScore ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Admin Approved</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand">{totalApproved}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Status</p>
          <p className="mt-1 text-sm font-semibold text-text">{detail.status.replace(/_/g, " ")}</p>
        </div>
      </div>

      {detail.hodOverallRemark && (
        <div className="mb-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3">HOD Overall Remark</p>
          <p className="mt-1 text-sm text-text">{detail.hodOverallRemark}</p>
        </div>
      )}

      <div className="space-y-4">
        {detail.items.map((item) => {
          const state = itemState[item.id] ?? { approvedPoints: item.hodApprovedPoints, remark: "" };
          const deducted = state.approvedPoints < item.hodApprovedPoints;

          return (
            <section
              key={item.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                <div>
                  <h3 className="font-display text-base font-semibold text-text">{item.heading}</h3>
                  <p className="mt-1 text-sm text-text-2">
                    Faculty: <span className="font-medium text-text">{item.selectedLabel || item.selectedValue}</span>
                  </p>

                  {item.facultyRemarks && (
                    <div className="mt-2 rounded-lg bg-bg p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Faculty Remarks / Author Position</p>
                      <p className="mt-1 text-sm text-text">{item.facultyRemarks}</p>
                    </div>
                  )}

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Faculty Points</p>
                      <p className="mt-0.5 text-sm font-semibold text-text">{item.facultyPoints}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-text-3">HOD Approved</p>
                      <p className="mt-0.5 text-sm font-semibold text-text">{item.hodApprovedPoints}</p>
                    </div>
                  </div>

                  {item.evidence && Array.isArray(item.evidence) && item.evidence.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.evidence.map((e, i) => (
                        <a
                          key={i}
                          href={e.viewUrl || e.url || e.directUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark"
                        >
                          {e.fileName ?? `Evidence ${i + 1}`}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}

                  {isEditable && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-text">
                          Admin Approved Points
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={item.hodApprovedPoints}
                          value={state.approvedPoints}
                          onChange={(e) =>
                            setItemState((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                approvedPoints: Math.min(
                                  item.hodApprovedPoints,
                                  Math.max(0, Number(e.target.value)),
                                ),
                              },
                            }))
                          }
                          className="mt-1 h-9 w-32 rounded-lg border border-border bg-surface px-3 text-sm text-text"
                        />
                      </div>
                      {deducted && (
                        <div>
                          <label className="block text-sm font-medium text-text">
                            Remark <span className="text-danger">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={state.remark}
                            onChange={(e) =>
                              setItemState((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], remark: e.target.value },
                              }))
                            }
                            placeholder="Required when deducting points"
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-brand/30"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!isEditable && item.adminRemark && (
                    <div className="mt-3 rounded-lg border border-border bg-bg p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Admin Remark</p>
                      <p className="mt-1 text-sm text-text">{item.adminRemark}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-xl bg-brand-light p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand">Admin Points</p>
                    <p className="mt-1 font-display text-3xl font-bold text-brand">{state.approvedPoints}</p>
                  </div>
                  {deducted && (
                    <div className="rounded-xl bg-danger-bg p-3 text-center">
                      <p className="text-xs font-semibold text-danger">
                        −{item.hodApprovedPoints - state.approvedPoints} deducted
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {isEditable && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <label className="block text-sm font-medium text-text">Overall Admin Remark</label>
          <textarea
            rows={3}
            value={overallRemark}
            onChange={(e) => setOverallRemark(e.target.value)}
            placeholder="Overall remarks for this appraisal review..."
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      )}

      {isEditable && (
        <div className="sticky bottom-0 mt-6 rounded-2xl border border-border bg-surface/95 p-4 shadow-modal backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-2">
              Total admin approved points: <span className="font-semibold text-text">{totalApproved}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectDialogOpen(true)}
                disabled={submitting || rejecting}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || rejecting}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {submitting ? "Forwarding..." : "Approve & Forward to HR"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={rejectDialogOpen}
        title="Reject Appraisal"
        description={
          <div className="space-y-3">
            <p className="text-sm text-text-2">
              This will reject the appraisal. Please provide a reason.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        }
        confirmLabel={rejecting ? "Rejecting..." : "Confirm Reject"}
        onCancel={() => { setRejectDialogOpen(false); setRejectReason(""); }}
        onConfirm={() => void handleReject()}
      />
    </AppShell>
  );
}

export default withAuth(AdminReviewDetail, ["MANAGEMENT", "SUPER_ADMIN"]);
