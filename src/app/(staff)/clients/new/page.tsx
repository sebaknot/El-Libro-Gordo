import { createClient } from "@/lib/supabase/server";
import { createClientRecord } from "../actions";
import ClientForm from "@/components/ClientForm";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; household?: string }>;
}) {
  const { error, household } = await searchParams;
  const supabase = await createClient();
  const { data: households } = await supabase
    .from("households")
    .select("id, household_name")
    .order("household_name");

  return (
    <div>
      <h1 className="text-2xl font-bold">New client</h1>
      <div className="mt-6">
        <ClientForm
          action={createClientRecord}
          households={households ?? []}
          values={{ household_id: household }}
          error={error}
          submitLabel="Create client"
        />
      </div>
    </div>
  );
}
