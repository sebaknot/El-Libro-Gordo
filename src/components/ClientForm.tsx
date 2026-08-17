type Household = { id: string; household_name: string };

type ClientValues = {
  household_id?: string;
  first_name?: string;
  last_name?: string;
  dob?: string | null;
  ssn_last4?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  status?: string;
  is_primary?: boolean;
  immigration_doc_type?: string | null;
  notes_summary?: string | null;
};

const input =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

export default function ClientForm({
  action,
  households,
  values = {},
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  households: Household[];
  values?: ClientValues;
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {error && <p className="rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate">First name *</label>
          <input name="first_name" required defaultValue={values.first_name ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">Last name *</label>
          <input name="last_name" required defaultValue={values.last_name ?? ""} className={input} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate">Household *</label>
        <select name="household_id" required defaultValue={values.household_id ?? ""} className={input}>
          <option value="" disabled>Select a household…</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>{h.household_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate">Date of birth</label>
          <input name="dob" type="date" defaultValue={values.dob ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">
            SSN {values.ssn_last4 ? `(on file: ···${values.ssn_last4})` : ""}
          </label>
          <input
            name="ssn"
            placeholder={values.ssn_last4 ? "Enter only to replace" : "###-##-####"}
            autoComplete="off"
            className={input}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate">Phone</label>
          <input name="phone" defaultValue={values.phone ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">WhatsApp phone</label>
          <input name="whatsapp_phone" defaultValue={values.whatsapp_phone ?? ""} className={input} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate">Email</label>
          <input name="email" type="email" defaultValue={values.email ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">Status</label>
          <select name="status" defaultValue={values.status ?? "active"} className={input}>
            {["active", "pending", "canceled", "medicare_transition", "deceased"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate">Immigration document type</label>
        <input name="immigration_doc_type" defaultValue={values.immigration_doc_type ?? ""} className={input} />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate">Summary notes</label>
        <textarea name="notes_summary" rows={2} defaultValue={values.notes_summary ?? ""} className={input} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_primary" defaultChecked={values.is_primary ?? false} />
        Primary client of the household
      </label>

      <button
        type="submit"
        className="rounded-md bg-sapphire px-5 py-2 text-sm font-semibold text-white hover:bg-sapphire/90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
