import { DISABILITY_TYPES } from '../disabilityOptions';

/**
 * Tappable disability-type options (instead of a native <select>, whose popup
 * overflows small screens). One column on narrow phones, two from 380px.
 */
const DisabilityTypePicker = ({ value, onChange, labelId }) => (
  <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
    {DISABILITY_TYPES.map(type => {
      const selected = value === type;
      return (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(type)}
          className={`flex min-h-[44px] w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold leading-snug transition-all ${
            selected
              ? 'border-rose-400 bg-rose-50 text-rose-600'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'}`}>
            {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>
          <span className="min-w-0 break-words">{type}</span>
        </button>
      );
    })}
  </div>
);

export default DisabilityTypePicker;
