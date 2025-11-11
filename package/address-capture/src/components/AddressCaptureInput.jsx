"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyAddress,
  normalizeAddressState,
  formatAddressForDisplay,
} from "../utils/addressState.js";

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
    placeholder: "Mountain View",
    autoComplete: "address-level2",
  },
  adminArea: {
    label: "Estado/Provincia*",
    placeholder: "CA",
    maxLength: 2,
    autoComplete: "address-level1",
  },
  postalCode: {
    label: "Código postal*",
    placeholder: "94043",
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

const DEFAULT_UI = {
  container: "space-y-4",
  grid: "grid gap-4 md:grid-cols-2",
  fieldWrapper: "relative",
  label: "text-sm font-medium text-gray-700",
  hint: "mt-1 text-xs text-gray-500",
  input:
    "mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60",
  suggestions:
    "absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-indigo-500/10",
  suggestionButton:
    "w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-indigo-50",
  suggestionButtonActive: "bg-indigo-50 text-indigo-700",
  suggestionMeta: "px-4 py-2 text-xs text-gray-400",
  error: "mt-1 text-xs text-rose-500",
  preview: "rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900",
};

function resolveFields(overrides = {}) {
  return Object.entries(DEFAULT_FIELD_CONFIG).map(([key, config]) => ({
    key,
    ...config,
    ...(overrides[key] || {}),
  }));
}

function joinClasses(...values) {
  return values.filter(Boolean).join(" ").trim();
}

/**
 * Address capture input with suggestion and normalization hooks.
 *
 * Props overview:
 * - value: current address object.
 * - onChange: callback receiving the normalized address.
 * - fetchSuggestions(query): returns an array of suggestions [{ id, description, ... }].
 * - fetchDetails(suggestion): resolves the selected suggestion into address fields.
 */
export function AddressCaptureInput({
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
}) {
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
              details?.line1 ||
              suggestion.description ||
              suggestion.label ||
              current.line1;
          }
          if (!merged.countryCode) {
            merged.countryCode = current.countryCode || createEmptyAddress().countryCode;
          }
          return merged;
        });
      } catch (error) {
        const message = error?.message || copy.suggestionError;
        setLocalError(message);
        if (typeof onError === "function") {
          onError(error);
        }
      } finally {
        setSuggesting(false);
      }
    },
    [fetchDetails, updateDraft, copy.suggestionError, onError]
  );

  useEffect(() => {
    if (typeof fetchSuggestions !== "function") {
      return;
    }

    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const query = (draft.line1 || "").trim();
    if (disabled || query.length < minSuggestLength) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setHighlighted(-1);
      setSuggesting(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSuggesting(true);
        const response = await fetchSuggestions(query);
        if (cancelled) return;

        const next = Array.isArray(response)
          ? response.slice(0, suggestionLimit)
          : [];
        setSuggestions(next);
        setSuggestionsOpen(next.length > 0);
        setHighlighted(next.length > 0 ? 0 : -1);
      } catch (error) {
        if (!cancelled) {
          setSuggestions([]);
          setSuggestionsOpen(false);
          setHighlighted(-1);
          if (typeof onError === "function") {
            onError(error);
          }
        }
      } finally {
        if (!cancelled) {
          setSuggesting(false);
        }
      }
    }, suggestDebounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    draft.line1,
    disabled,
    fetchSuggestions,
    minSuggestLength,
    suggestDebounceMs,
    suggestionLimit,
    onError,
  ]);

  const handleLine1KeyDown = useCallback(
    (event) => {
      if (!suggestionsOpen || suggestions.length === 0) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (event.key === "Enter" || event.key === "Tab") {
        if (highlighted >= 0 && highlighted < suggestions.length) {
          event.preventDefault();
          handleSuggestionSelect(suggestions[highlighted]);
        }
      } else if (event.key === "Escape") {
        setSuggestionsOpen(false);
        setHighlighted(-1);
      }
    },
    [
      suggestionsOpen,
      suggestions.length,
      highlighted,
      handleSuggestionSelect,
    ]
  );

  const containerClass = joinClasses(classes.container, className);

  return (
    <section className={containerClass}>
      <div className={classes.grid}>
        {fieldConfig.map((field) => (
          <div
            key={field.key}
            className={classes.fieldWrapper}
            onBlur={(event) => {
              if (
                event.currentTarget.contains(event.relatedTarget) ||
                field.key !== "line1"
              ) {
                return;
              }
              setSuggestionsOpen(false);
              setHighlighted(-1);
            }}
            onPointerDownCapture={(event) => {
              if (event.target.closest("[data-suggestion-item]")) {
                event.preventDefault();
              }
            }}
          >
            <label className={classes.label}>{field.label}</label>
            {field.hint ? (
              <p className={classes.hint}>{field.hint}</p>
            ) : null}
            <input
              type="text"
              value={draft[field.key] ?? ""}
              onChange={handleFieldChange(field.key)}
              onFocus={() => {
                if (field.key === "line1" && suggestions.length > 0) {
                  setSuggestionsOpen(true);
                }
              }}
              onKeyDown={field.key === "line1" ? handleLine1KeyDown : undefined}
              disabled={disabled}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              className={classes.input}
            />

            {field.key === "line1" &&
            suggestionsOpen &&
            suggestions.length > 0 ? (
              <ul className={classes.suggestions} role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.id ?? suggestion.placeId ?? index}>
                    <button
                      type="button"
                      data-suggestion-item
                      onPointerDown={(event) => {
                        event.preventDefault();
                        handleSuggestionSelect(suggestion);
                      }}
                      onMouseEnter={() => setHighlighted(index)}
                      className={joinClasses(
                        classes.suggestionButton,
                        highlighted === index && classes.suggestionButtonActive
                      )}
                      tabIndex={-1}
                    >
                      {suggestion.description || suggestion.label || ""}
                    </button>
                  </li>
                ))}
                {suggesting ? (
                  <li className={classes.suggestionMeta}>
                    {copy.suggestionSearching}
                  </li>
                ) : null}
              </ul>
            ) : null}

            {errors?.[field.key] ? (
              <p className={classes.error}>{errors[field.key]}</p>
            ) : null}
          </div>
        ))}
      </div>

      {localError ? <p className="text-sm text-rose-600">{localError}</p> : null}
      {errors?.general ? (
        <p className="text-sm text-rose-600">{errors.general}</p>
      ) : null}

      {showPreview ? (
        <div className={classes.preview}>
          <p className="font-semibold text-sm">{copy.previewLabel}</p>
          <p>
            {formatAddressForDisplay(draft) || copy.previewEmpty}
          </p>
        </div>
      ) : null}
    </section>
  );
}
