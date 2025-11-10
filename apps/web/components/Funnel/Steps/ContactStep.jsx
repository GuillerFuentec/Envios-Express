"use strict";

const ContactStep = ({ data, errors, onChange }) => (
  <div className="fields-grid">
    <div className="field">
      <label htmlFor="contactName">Nombre completo</label>
      <input
        id="contactName"
        type="text"
        value={data.name}
        onChange={(event) => onChange("contact", "name", event.target.value)}
        placeholder="Nombre y apellidos"
      />
      {errors.name && <span className="field-error">{errors.name}</span>}
    </div>
    <div className="field">
      <label htmlFor="contactEmail">Correo electrónico</label>
      <input
        id="contactEmail"
        type="email"
        value={data.email}
        onChange={(event) => onChange("contact", "email", event.target.value)}
        placeholder="ejemplo@correo.com"
      />
      {errors.email && <span className="field-error">{errors.email}</span>}
    </div>
    <div className="field">
      <label htmlFor="contactPhone">Teléfono</label>
      <input
        id="contactPhone"
        type="tel"
        value={data.phone}
        onChange={(event) => onChange("contact", "phone", event.target.value)}
        placeholder="+1 305 555 1234"
      />
      {errors.phone && <span className="field-error">{errors.phone}</span>}
    </div>
    <label className="toggle-row" htmlFor="smsConsent">
      <span>Acepto recibir actualizaciones vía SMS</span>
      <input
        id="smsConsent"
        type="checkbox"
        checked={data.smsConsent}
        onChange={(event) => onChange("contact", "smsConsent", event.target.checked)}
      />
    </label>
    {errors.smsConsent && <span className="field-error">{errors.smsConsent}</span>}
  </div>
);

export default ContactStep;
