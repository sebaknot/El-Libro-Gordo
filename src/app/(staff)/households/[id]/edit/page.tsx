import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateHousehold } from "../../actions";
import HouseholdForm from "@/components/HouseholdForm";

export default async function EditHouseholdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: household } = await supabase.from("households").select("*").eq("id", id).single();
  if (!household) notFound();

  const update = updateHousehold.bind(null, id);

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit: {household.household_name}</h1>
      <div className="mt-6">
        <HouseholdForm action={update} values={household} error={error} submitLabel="Save changes" />
      </div>
    </div>
  );
}
