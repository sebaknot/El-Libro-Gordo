import { createHousehold } from "../actions";
import HouseholdForm from "@/components/HouseholdForm";

export default async function NewHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <h1 className="text-2xl font-bold">New household</h1>
      <div className="mt-6">
        <HouseholdForm action={createHousehold} error={error} submitLabel="Create household" />
      </div>
    </div>
  );
}
