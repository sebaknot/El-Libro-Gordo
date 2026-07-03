import EnrollForm from "./EnrollForm";

// Auth pages must never be statically prerendered: they create a Supabase
// client, which needs runtime env vars.
export const dynamic = "force-dynamic";

export default function MfaEnrollPage() {
  return <EnrollForm />;
}
