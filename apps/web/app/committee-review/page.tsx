"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
} from "lucide-react";
import { withAuth } from "@/components/auth/withAuth";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { getPrimaryRole } from "@/lib/utils/routing";
import { useAuthStore } from "@/store/auth";

interface AppraisalForReview {
  id: string;
  status: string;
  cycle: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    department?: {
      id: string;
      name: string;
    } | null;
  };
  submittedAt: string;
  finalScore: number | null;
  totalSelectedPoints: number;
  itemsCount: number;
}

const ACTIVE_STATUSES = ["HOD_REVIEW", "COMMITTEE_REVIEW"];

function getStatusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    COMMITTEE_REVIEW: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      label: "Pending Review",
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    HOD_REVIEW: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      label: "HOD Review",
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    HR_FINALIZED: {
      bg: "bg-green-100",
      text: "text-green-800",
      label: "Submitted to HR",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    FULLY_APPROVED: {
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      label: "Fully Approved",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
  };

  const badge = map[status] ?? map.COMMITTEE_REVIEW;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full ${badge.bg} ${badge.text} px-3 py-1 text-xs font-semibold uppercase tracking-wider`}
    >
      {badge.icon}
      {badge.label}
    </div>
  );
}

function CommitteeDashboardPage() {
  const { session } = useAuthStore();
  const role = getPrimaryRole(session?.user.roles ?? []);

  const [appraisals, setAppraisals] = useState<AppraisalForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAppraisals() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.committee.getTeamAppraisals();

        if (active) {
          setAppraisals(
            response.data.map((appraisal) => ({
              ...appraisal,
              totalSelectedPoints: appraisal.items?.reduce(
                (sum, item) => sum + (item.points ?? 0),
                0,
              ),
              itemsCount: appraisal.items?.length ?? 0,
            })) as AppraisalForReview[],
          );
        }
      } catch (loadError: any) {
        if (active) {
          setError(
            loadError?.response?.data?.message ||
              loadError?.message ||
              "Failed to load appraisals for review",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAppraisals();

    return () => {
      active = false;
    };
  }, []);

  const pending = appraisals.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const reviewed = appraisals.filter((a) => !ACTIVE_STATUSES.includes(a.status));

  if (loading) {
    return (
      <AppShell role={role}>
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-6">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          <span className="text-sm text-text-2">Loading appraisals...</span>
        </div>
      </AppShell>
    );
  }

  function AppraisalCard({
    appraisal,
    viewOnly,
  }: {
    appraisal: AppraisalForReview;
    viewOnly: boolean;
  }) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div>
                <h4 className="font-semibold text-text">
                  {appraisal.user.firstName} {appraisal.user.lastName}
                </h4>
                <p className="mt-0.5 text-xs text-text-3">
                  {appraisal.user.email}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                  Department
                </p>
                <p className="mt-1 text-sm font-medium text-text">
                  {appraisal.user.department?.name ?? "Not assigned"}
                </p>
              </div>
              <div className="rounded-lg bg-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                  Cycle
                </p>
                <p className="mt-1 text-sm font-medium text-text">
                  {appraisal.cycle.name}
                </p>
              </div>
              <div className="rounded-lg bg-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                  Total Points
                </p>
                <p className="mt-1 text-sm font-medium text-text">
                  {appraisal.totalSelectedPoints}
                </p>
              </div>
              <div className="rounded-lg bg-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                  Status
                </p>
                <div className="mt-1">{getStatusBadge(appraisal.status)}</div>
              </div>
            </div>

            <p className="mt-3 text-xs text-text-3">
              Submitted:{" "}
              {new Date(appraisal.submittedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={`/committee-review/${appraisal.id}/review`}
              className={
                viewOnly
                  ? "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text-2 transition hover:bg-surface-2 whitespace-nowrap"
                  : "inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark whitespace-nowrap"
              }
            >
              <Eye className="h-4 w-4" />
              {viewOnly ? "View" : "Review"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell role={role}>
      <PageHeader
        title="Committee Review Dashboard"
        subtitle="Review and approve faculty appraisals submitted by HOD"
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-danger/20 bg-danger-bg p-4 text-sm text-danger">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        </div>
      )}

      {appraisals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg">
            <CheckCircle2 className="h-6 w-6 text-text-3" />
          </div>
          <h3 className="mb-2 font-display text-lg font-semibold text-text">
            No appraisals to review
          </h3>
          <p className="text-sm text-text-2">
            There are no appraisals assigned to your committee at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Review */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-text">
                Pending Review
              </h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {pending.length}
                </span>
              )}
            </div>
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-2">
                No appraisals pending committee review.
              </div>
            ) : (
              <div className="grid gap-4">
                {pending.map((appraisal) => (
                  <AppraisalCard
                    key={appraisal.id}
                    appraisal={appraisal}
                    viewOnly={false}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Reviewed / Submitted */}
          {reviewed.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-text">
                  Committee Review Submitted
                </h2>
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-text-3">
                  {reviewed.length}
                </span>
              </div>
              <p className="mb-4 text-sm text-text-2">
                These appraisals have been reviewed by your committee and
                forwarded to HR. They are read-only.
              </p>
              <div className="grid gap-4">
                {reviewed.map((appraisal) => (
                  <AppraisalCard
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

export default withAuth(CommitteeDashboardPage, ["COMMITTEE"]);
