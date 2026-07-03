import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_COLUMNS } from "@/lib/clients";
import { updateClientRecord } from "../../actions";
import ClientForm from "@/components/ClientForm";

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: client }, { data: households }] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLUMNS).eq("id", id).single(),
    supabase.from("households").select("id, household_name").order("household_name"),
  ]);
  if (!client) notFound();

  const update = updateClientRecord.bind(null, id);

  return (
    <div>
      <h1 className="text-2xl font-bold">
        Edit: {client.first_name} {client.last_name}
      </h1>
      <div className="mt-6">
        <ClientForm
          action={update}
          households={households ?? []}
          values={client}
          error={error}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
