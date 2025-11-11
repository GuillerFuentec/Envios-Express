"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyAddress,
  normalizeAddressState,
  formatAddressForDisplay,
} from "../../utils/addressState.js";

const DEFAULT_FIELD_CONFIG = {
  line1: {
    label: "Dirección (calle y número)*",
    placeholder: "1600 Amphitheatre Pkwy",
    hint: "Escribe y elige una sugerencia oficial.",
    autoComplete: "street-address",
  },
  line2: {
    label: "Detalles adicionales",
    placeholder: "Suite, Apt, etc.",
    hint: "Departamento, suite u otras referencias (opcional).",
    autoComplete: "address-line2",
  },
  locality: {
    label: "Ciudad*",
    placeholder: "Miami",
    autoComplete: "address-level2",
  },
  adminArea: {
    label: "Estado/Provincia*",
    placeholder: "FL",
    maxLength: 2,
    autoComplete: "address-level1",
  },
  postalCode: {
    label: "Código postal*",
    placeholder: "33137",
    autoComplete: "postal-code",
    inputMode: "numeric",
  },
};

const DEFAULT_COPY = {
  previewLabel: "Dirección capturada",
  previewEmpty: "Completa los campos o elige una sugerencia para autocompletar.",
  suggestionSearching: "Buscando coincidencias...",
  suggestionError: "No se pudo recuperar la dirección seleccionada.",
};

// New UI mapping aligned with global funnel styles
const DEFAULT_UI = {
  container: "address-capture space-y-5",
  grid: "fields-grid",
  fieldWrapper: "field",
  label: "text-sm font-medium",
  hint: "text-xs text-slate-500",
  input: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
  suggestions: "address-suggestions absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
  suggestionButton: "w-full px-4 py-2 text-left text-sm flex flex-col gap-0.5 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none",
  suggestionPrimary: "font-medium text-slate-800 truncate",
  suggestionSecondary: "text-xs text-slate-500 truncate",
  suggestionButtonActive: "bg-teal-100",
  suggestionMeta: "px-4 py-2 text-xs text-slate-400",
  emptyState: "px-4 py-3 text-sm text-slate-500",
  error: "mt-1 text-xs text-rose-600",
  preview: "rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700",
  badge: "inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700 uppercase tracking-wide",
  spinner: "animate-spin h-3 w-3 border-[3px] border-teal-500 border-t-transparent rounded-full",
};

const resolveFields = (overrides = {}) =>
  Object.entries(DEFAULT_FIELD_CONFIG).map(([key, config]) => ({
    key,
    ...config,
    ...(overrides[key] || {}),
  }));

const joinClasses = (...values) => values.filter(Boolean).join(" ").trim();

export const AddressCaptureInput = ({
  value,
  onChange,
  disabled = false,
  errors = {},
  fetchSuggestions,
  fetchDetails,
  minSuggestLength = 3,
  suggestDebounceMs = 150,
  suggestionLimit = 8,
  showPreview = true,
  labels = {},
  fieldLabels = {},
  ui = {},
  className = "",
  onError,
}) => {
  const copy = { ...DEFAULT_COPY, ...labels };
  const fieldConfig = useMemo(() => resolveFields(fieldLabels), [fieldLabels]);
  const classes = useMemo(() => ({ ...DEFAULT_UI, ...ui }), [ui]);

  const valueSignature = useMemo(
    () => JSON.stringify(value ?? createEmptyAddress()),
    [value]
  );
  const normalizedValue = useMemo(
    () => normalizeAddressState(value),
    [valueSignature]
  );

  const [draft, setDraft] = useState(normalizedValue);
  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [suggesting, setSuggesting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const firstRun = useRef(true);
  const suggestionsRef = useRef(null);

  const emitChange = useCallback(
    (nextAddress) => {
      if (typeof onChange === "function") {
        onChange(nextAddress);
      }
    },
    [onChange]
  );

  const updateDraft = useCallback(
    (patchOrUpdater) => {
      setDraft((prev) => {
        const base = normalizeAddressState(prev);
        const nextState =
          typeof patchOrUpdater === "function"
            ? patchOrUpdater(base)
            : { ...base, ...patchOrUpdater };
        const normalizedNext = normalizeAddressState(nextState);
        emitChange(normalizedNext);
        return normalizedNext;
      });
    },
    [emitChange]
  );

  const handleFieldChange = useCallback(
    (key) => (event) => {
      const raw = event?.target?.value ?? "";
      const value = key === "adminArea" ? raw.toUpperCase() : raw;

      if (key === "line1") {
        console.debug("[address-capture] line1 input change", {
          rawLength: raw.length,
          valueSample: raw.slice(0, 50),
        });
        setLocalError(null);
        if (suggestions.length > 0) {
          setSuggestionsOpen(true);
        }
      }

      updateDraft({ [key]: value, normalized: null });
    },
    [updateDraft, suggestions.length]
  );

  const handleSuggestionSelect = useCallback(
    async (suggestion) => {
      if (!suggestion) {
        return;
      }

      setLocalError(null);
      setSuggestionsOpen(false);
      setSuggestions([]);
      setHighlighted(-1);

      if (typeof fetchDetails !== "function") {
        updateDraft((current) => ({
          ...current,
          line1: suggestion.description || suggestion.label || current.line1,
          normalized: suggestion.description
            ? { ...(current.normalized || {}), full: suggestion.description }
            : current.normalized,
        }));
        return;
      }

      setSuggesting(true);
      try {
        const details = await fetchDetails(suggestion);
        updateDraft((current) => {
          const merged = { ...current, ...(details || {}) };
          if (!merged.line1) {
            merged.line1 =
              suggestion.description || suggestion.label || current.line1;
          }
          merged.normalized = merged.normalized || {
            full: formatAddressForDisplay(merged),
          };
          return merged;
        });
      } catch (error) {
        console.error("[address-capture] fetchDetails failed", error);
        setLocalError(copy.suggestionError);
        if (typeof onError === "function") {
          onError(error);
        }
      } finally {
        setSuggesting(false);
      }
    },
    [fetchDetails, updateDraft, copy.suggestionError, onError]
  );

  const requestSuggestions = useCallback(
    (query) => {
      if (typeof fetchSuggestions !== "function") {
        console.debug("[address-capture] fetchSuggestions not provided; skipping", {
          query,
        });
        return;
      }
      if (!query || query.trim().length < minSuggestLength) {
        console.debug("[address-capture] query too short for suggestions", {
          query,
          length: query ? query.trim().length : 0,
          minSuggestLength,
        });
        setSuggestions([]);
        setSuggestionsOpen(false);
        setHighlighted(-1);
        return;
      }
      console.debug("[address-capture] requesting suggestions", {
        query: query.trim(),
        minSuggestLength,
      });
      setSuggesting(true);
      fetchSuggestions(query.trim())
        .then((list) => {
          console.debug("[address-capture] suggestions response", {
            query: query.trim(),
            count: list.length,
          });
          setSuggestions(list.slice(0, suggestionLimit));
          setSuggestionsOpen(list.length > 0);
          setHighlighted(list.length > 0 ? 0 : -1);
        })
        .catch((error) => {
          console.error("[address-capture] fetchSuggestions failed", error);
          if (typeof onError === "function") {
            onError(error);
          }
          setSuggestions([]);
          setSuggestionsOpen(false);
        })
        .finally(() => setSuggesting(false));
    },
    [fetchSuggestions, minSuggestLength, suggestionLimit, onError]
  );

  const debouncedQuery = useRef(null);
  useEffect(() => {
    if (!fetchSuggestions || disabled) {
      if (disabled) {
        console.debug("[address-capture] suggestions disabled", { disabled });
      }
      return undefined;
    }
    if (debouncedQuery.current) {
      clearTimeout(debouncedQuery.current);
    }
    debouncedQuery.current = setTimeout(() => {
      if (!draft.line1) {
        console.debug("[address-capture] no line1 value; clearing suggestions");
        setSuggestions([]);
        setSuggestionsOpen(false);
        return;
      }
      console.debug("[address-capture] debounce fired; will request suggestions", {
        line1Sample: draft.line1.slice(0, 60),
        length: draft.line1.length,
      });
      requestSuggestions(draft.line1);
    }, suggestDebounceMs);
    return () => {
      if (debouncedQuery.current) {
        clearTimeout(debouncedQuery.current);
      }
    };
  }, [draft.line1, requestSuggestions, suggestDebounceMs, fetchSuggestions, disabled]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!draft.line1) {
      setSuggestions([]);
      setSuggestionsOpen(false);
    }
  }, [draft.line1]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!suggestionsOpen || suggestions.length === 0) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((prev) => (prev + 1) % suggestions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((prev) =>
          prev - 1 < 0 ? suggestions.length - 1 : prev - 1
        );
      } else if (event.key === "Enter" && highlighted >= 0) {
        event.preventDefault();
        handleSuggestionSelect(suggestions[highlighted]);
      } else if (event.key === "Escape") {
        setSuggestionsOpen(false);
      }
    },
    [suggestionsOpen, suggestions, highlighted, handleSuggestionSelect]
  );

  // Scroll highlighted into view for keyboard navigation
  useEffect(() => {
    if (!suggestionsRef.current) return;
    const buttons = suggestionsRef.current.querySelectorAll('button[data-idx]');
    const target = buttons[highlighted];
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  return (
    <div className={joinClasses(classes.container, className)}>
      <div className={classes.fieldWrapper}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <label className={classes.label} htmlFor="address-line1">
            {fieldConfig.find((field) => field.key === "line1")?.label}
          </label>
          <span className={classes.badge}>Autocomplete</span>
        </div>
        <div className="address-input">
          <input
            id="address-line1"
            name="address-line1"
            type="text"
            value={draft.line1}
            onChange={handleFieldChange("line1")}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={fieldConfig.find((field) => field.key === "line1")?.placeholder}
            autoComplete={fieldConfig.find((field) => field.key === "line1")?.autoComplete}
            className={classes.input}
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls="address-suggestions-list"
          />
          {suggesting && (
            <div style={{position:'absolute', top:10, right:10}}>
              <div className={classes.spinner} />
            </div>
          )}
          {suggestionsOpen && (
            <div
              ref={suggestionsRef}
              className={classes.suggestions}
              id="address-suggestions-list"
              role="listbox"
            >
              {suggestions.length === 0 && !suggesting && (
                <div className={classes.emptyState}>Sin sugerencias. Escribe más detalles.</div>
              )}
              {suggestions.map((suggestion, index) => {
                const primary = suggestion.description || suggestion.label || '';
                const parts = primary.split(',');
                const main = parts[0];
                const secondary = parts.slice(1).join(',').trim();
                return (
                  <button
                    type="button"
                    key={suggestion.id || suggestion.placeId || primary}
                    data-idx={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={joinClasses(
                      classes.suggestionButton,
                      index === highlighted ? classes.suggestionButtonActive : ""
                    )}
                    role="option"
                    aria-selected={index === highlighted}
                  >
                    <span className={classes.suggestionPrimary}>{main}</span>
                    {secondary && (
                      <span className={classes.suggestionSecondary}>{secondary}</span>
                    )}
                  </button>
                );
              })}
              {suggesting && (
                <div className={classes.suggestionMeta}>{copy.suggestionSearching}</div>
              )}
            </div>
          )}
        </div>
        <p className={classes.hint}>{fieldConfig.find((field) => field.key === "line1")?.hint}</p>
        {localError && <p className={classes.error}>{localError}</p>}
      </div>

      <div className={classes.grid}>
        {fieldConfig
          .filter((field) => field.key !== "line1")
          .map((field) => (
            <div key={field.key} className={classes.fieldWrapper}>
              <label className={classes.label} htmlFor={`address-${field.key}`}>
                {field.label}
              </label>
              <input
                id={`address-${field.key}`}
                name={`address-${field.key}`}
                type="text"
                value={draft[field.key] || ""}
                onChange={handleFieldChange(field.key)}
                disabled={disabled}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                maxLength={field.maxLength}
                inputMode={field.inputMode}
                className={classes.input}
              />
              {field.hint && <p className={classes.hint}>{field.hint}</p>}
              {errors[field.key] && <p className={classes.error}>{errors[field.key]}</p>}
            </div>
          ))}
      </div>

      {showPreview && (
        <div className={classes.preview}>
          <p className="text-xs font-semibold text-slate-600 mb-1">{copy.previewLabel}</p>
          <p className="text-sm text-slate-700">
            {formatAddressForDisplay(draft) || copy.previewEmpty}
          </p>
        </div>
      )}
    </div>
  );
};
