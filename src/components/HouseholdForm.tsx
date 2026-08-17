type HouseholdValues = {
  household_name?: string;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  annual_income?: number | null;
  income_verified_date?: string | null;
  household_size?: number | null;
  preferred_language?: string;
  preferred_channel?: string | null;
};

const input =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

export default function HouseholdForm({
  action,
  values = {},
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  values?: HouseholdValues;
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {error && <p className="rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-slate">Household name *</label>
        <input name="household_name" required defaultValue={values.household_name ?? ""} className={input} />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate">Street address</label>
        <input name="address_street" defaultValue={values.address_street ?? ""} className={input} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate">City</label>
          <input name="address_city" defaultValue={values.address_city ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">State</label>
          <input name="address_state" maxLength={2} defaultValue={values.address_state ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">ZIP</label>
          <input name="address_zip" defaultValue={values.address_zip ?? ""} className={input} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate">Annual income ($)</label>
          <input name="annual_income" type="number" step="0.01" min="0" defaultValue={values.annual_income ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">Income verified on</label>
          <input name="income_verified_date" type="date" defaultValue={values.income_verified_date ?? ""} className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">Household size</label>
          <input name="household_size" type="number" min="1" defaultValue={values.household_size ?? ""} className={input} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate">Preferred language</label>
          <select name="preferred_language" defaultValue={values.preferred_language ?? "es"} className={input}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">Preferred channel</label>
          <select name="preferred_channel" defaultValue={values.preferred_channel ?? ""} className={input}>
            <option value="">—</option>
            {["sms", "whatsapp", "email", "call"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-sapphire px-5 py-2 text-sm font-semibold text-white hover:bg-sapphire/90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
