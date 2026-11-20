// Physically challenged / disability (Divyang) on the matrimonial profile.
// Stored on the server as personal.hasDisability (Boolean) + personal.disabilityType (text).

export const DISABILITY_TYPES = [
  'Locomotor / Physical disability',
  'Visual impairment',
  'Hearing impairment',
  'Speech & language disability',
  'Intellectual / Learning disability',
  'Other'
];

/** Form fields from a saved profile's `personal` block. */
export const disabilityFormFromProfile = (personal = {}) => {
  const has = !!personal?.hasDisability;
  const type = String(personal?.disabilityType || '').trim();
  const isPreset = type && DISABILITY_TYPES.includes(type) && type !== 'Other';
  return {
    hasDisability: has ? 'Yes' : 'No',
    disabilityChoice: has ? (isPreset ? type : (type ? 'Other' : '')) : '',
    disabilityOther: has && !isPreset ? type : ''
  };
};

/** Fields to send to the server. Returns { error } when "Yes" has no type. */
export const disabilityPayloadFromForm = (form) => {
  if (form.hasDisability !== 'Yes') return { hasDisability: false, disabilityType: '' };
  const type = form.disabilityChoice === 'Other'
    ? String(form.disabilityOther || '').trim()
    : String(form.disabilityChoice || '').trim();
  if (!type) return { error: 'Please select or enter the type of disability.' };
  return { hasDisability: true, disabilityType: type.slice(0, 100) };
};

/** Text for profile screens: "No" / "Yes – Visual impairment". */
export const disabilityLabel = (personal) => {
  if (!personal || personal.hasDisability === undefined) return null;
  return personal.hasDisability ? `Yes${personal.disabilityType ? ` – ${personal.disabilityType}` : ''}` : 'No';
};
