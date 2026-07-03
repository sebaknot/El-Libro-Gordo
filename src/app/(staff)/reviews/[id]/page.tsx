import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveResponse, markReviewed } from "../actions";

type Changes = {
  income?: { annual_income: number };
  employment?: string;
  address?: { street: string | null; city: string | null; state: string | null; zip: string | null };
  contact?: { phone: string | null; email: string | null };
  members_removed?: string[];
  members_added?: { first_name: string; last_name: string; dob: string | null }[];
  income_proof_uploaded?: boolean;
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: response } = await supabase
    .from("verification_responses")
    .select("id, submitted_at, confirmed_no_changes, changes, client_ip, user_agent, consent_text_shown, consent_checked, reviewed, household_id, households(id, household_name, address_street, address_city, address_state, address_zip, annual_income)")
    .eq("id", id)
    .single();
  if (!response) notFound();

  const household = response.households as unknown as {
    id: string;
    household_name: string;
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
    annual_income: number | null;
  };
  const changes = (response.changes ?? {}) as Changes;

  const currentAddress =
    [household.address_street, household.address_city, household.address_state, household.address_zip]
      .filter(Boolean)
      .join(", ") || "—";
  const newAddress = changes.address
    ? [changes.address.street, changes.address.city, changes.address.state, changes.address.zip]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-slate-400">
        <Link href="/reviews" className="hover:underline">← Reviews</Link>
      </p>
      <h1 className="mt-1 text-2xl font-bold">
        <Link href={`/households/${household.id}`} className="text-blue-700 hover:underline">
          {household.household_name}
        </Link>
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Submitted {new Date(response.submitted_at).toLocaleString()} · IP {response.client_ip ?? "—"}
        {response.reviewed && " · already reviewed"}
      </p>

      {response.confirmed_no_changes ? (
        <p className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          ✅ Client confirmed everything is the same.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 w-32">Field</th>
                <th className="px-4 py-2">On file</th>
                <th className="px-4 py-2">Reported</th>
              </tr>
            </thead>
            <tbody>
              {changes.income && (
                <DiffRow
                  label="Income"
                  oldValue={household.annual_income != null ? `$${Number(household.annual_income).toLocaleString()}` : "—"}
                  newValue={`$${changes.income.annual_income.toLocaleString()}`}
                />
              )}
              {newAddress && <DiffRow label="Address" oldValue={currentAddress} newValue={newAddress} />}
              {changes.contact?.phone && <DiffRow label="Phone" oldValue="(primary's current)" newValue={changes.contact.phone} />}
              {changes.contact?.email && <DiffRow label="Email" oldValue="(primary's current)" newValue={changes.contact.email} />}
              {changes.employment && <DiffRow label="Employment" oldValue="—" newValue={changes.employment} />}
              {changes.members_removed && (
                <DiffRow label="Removed" oldValue="in household" newValue={changes.members_removed.join(", ")} />
              )}
              {changes.members_added && (
                <DiffRow
                  label="Added"
                  oldValue="—"
                  newValue={changes.members_added.map((m) => `${m.first_name} ${m.last_name}${m.dob ? ` (${m.dob})` : ""}`).join(", ")}
                />
              )}
              {changes.income_proof_uploaded && (
                <DiffRow label="Document" oldValue="—" newValue="Income proof uploaded (see household documents)" />
              )}
            </tbody>
          </table>
        </div>
      )}

      <details className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
        <summary className="cursor-pointer font-medium">Consent record</summary>
        <p className="mt-2">{response.consent_text_shown}</p>
        <p className="mt-1">Checked: {response.consent_checked ? "yes" : "no"} · UA: {response.user_agent ?? "—"}</p>
      </details>

      {!response.reviewed && (
        <div className="mt-6 flex gap-3">
          <form action={approveResponse.bind(null, response.id)}>
            <button className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">
              {response.confirmed_no_changes ? "Mark reviewed" : "Approve & apply changes"}
            </button>
          </form>
          {!response.confirmed_no_changes && (
            <form action={markReviewed.bind(null, response.id)}>
              <button className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Mark reviewed without applying
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function DiffRow({ label, oldValue, newValue }: { label: string; oldValue: string; newValue: string }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-2 font-medium">{label}</td>
      <td className="px-4 py-2 text-slate-500">{oldValue}</td>
      <td className="px-4 py-2 font-medium text-blue-800">{newValue}</td>
    </tr>
  );
}
