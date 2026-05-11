import { Link2, MapPinned, UserRound } from "lucide-react";

function Field({
  name,
  label,
  helper,
  placeholder,
  required,
  type = "text"
}: {
  name: string;
  label: string;
  helper?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
        {required ? <span className="text-monk">Required</span> : <span className="font-semibold normal-case tracking-normal text-muted/70">Optional</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="focus-ring h-11 w-full border border-stoneLine bg-paper px-3 text-sm text-ink"
        placeholder={placeholder}
      />
      {helper ? <span className="mt-2 block text-xs leading-5 text-muted">{helper}</span> : null}
    </label>
  );
}

export function LeadForm() {
  return (
    <div className="space-y-5">
      <div className="border border-stoneLine bg-ivory p-4">
        <div className="flex items-start gap-3">
          <MapPinned className="mt-0.5 shrink-0 text-monk" size={19} />
          <div>
            <h3 className="font-semibold text-ink">Google Maps is preferred</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              One Maps profile is usually enough to begin. Add other links only if you already have them.
            </p>
          </div>
        </div>
      </div>

      <Field
        name="googleMapsUrl"
        label="Google Maps / GBP link"
        placeholder="https://maps.google.com/... or https://g.page/..."
        helper="Preferred when available. Website, social, or another public source can also start the audit."
      />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Link2 size={17} className="text-monk" />
          <h3 className="font-semibold text-ink">Other links</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="website" label="Website URL" placeholder="https://business.com" />
          <Field name="instagramUrl" label="Instagram URL" placeholder="https://instagram.com/business" />
          <Field name="facebookUrl" label="Facebook URL" placeholder="https://facebook.com/business" />
          <Field name="otherPublicLink" label="Other public link" placeholder="YouTube, marketplace, directory, LinkedIn" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <UserRound size={17} className="text-monk" />
          <h3 className="font-semibold text-ink">Point of contact</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="contactName" label="Contact name" placeholder="Owner, manager, or marketing contact" />
          <Field name="contactRole" label="Contact role" placeholder="Founder, clinic manager, marketing head" />
          <Field name="phone" label="Phone / WhatsApp" placeholder="+91..." />
          <Field name="email" label="Contact email" type="email" placeholder="name@example.com" />
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Sales context <span className="font-semibold normal-case tracking-normal text-muted/70">Optional</span></span>
        <textarea
          name="salesContext"
          className="focus-ring min-h-28 w-full border border-stoneLine bg-paper p-3 text-sm text-ink"
          placeholder="Add anything the salesperson already knows: source, referral context, service interest, urgency, or call notes."
        />
      </label>
    </div>
  );
}
