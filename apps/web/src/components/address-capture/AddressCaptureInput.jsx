"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import {
  createEmptyAddress,
  normalizeAddressState,
  formatAddressForDisplay,
} from "../../utils/addressState.js";
import { Dropdown } from "../Funnel/Dropdown.jsx";

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
  previewEmpty:
    "Completa los campos o elige una sugerencia para autocompletar.",
  suggestionSearching: "Buscando coincidencias...",
  suggestionError: "No se pudo recuperar la dirección seleccionada.",
};

// New UI mapping aligned with global funnel styles
const DEFAULT_UI = {
  container: "address-capture space-y-5",
  grid: "fields-grid",
  fieldWrapper: "field",
  label: "text-sm font-medium relative",
  hint: "text-xs text-slate-500",
  inputWrapper: "field",
  input:
    "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
  suggestions:
    "absolute z-50 left-0 right-0 top-full mt-2 max-h-72 overflow-auto " +
    "origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5",
  suggestionButton:
    "w-full px-4 py-2 text-left text-sm flex flex-col gap-0.5 " +
    "hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
  suggestionPrimary: "font-medium text-gray-800 truncate",
  suggestionSecondary: "text-xs text-gray-500 truncate",
  suggestionButtonActive: "bg-gray-100",
  suggestionMeta: "px-4 py-2 text-xs text-slate-400",
  emptyState: "px-4 py-3 text-sm text-slate-500",
  error: "mt-1 text-xs text-rose-600",
  preview:
    "rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700",
  badge:
    "inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700 uppercase tracking-wide",
  spinner:
    "animate-spin h-3 w-3 border-[3px] border-teal-500 border-t-transparent rounded-full",
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
  const selectedSignatureRef = useRef(null); // stores the last accepted suggestion signature
  const suggestionRequestIdRef = useRef(0);

  const cancelPendingSuggestions = useCallback(() => {
    suggestionRequestIdRef.current += 1;
    setSuggesting(false);
  }, []);

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

      cancelPendingSuggestions();
      setLocalError(null);
      setSuggestionsOpen(false);
      setSuggestions([]);
      setHighlighted(-1);
      // store signature so we don't reopen until user edits line1 differently
      const sig =
        suggestion.description ||
        suggestion.label ||
        suggestion.placeId ||
        suggestion.id;
      selectedSignatureRef.current = sig;

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

          // clave: la firma debe ser el valor FINAL del input
          selectedSignatureRef.current = (merged.line1 || "").trim();

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
    [
      fetchDetails,
      updateDraft,
      copy.suggestionError,
      onError,
      cancelPendingSuggestions,
    ]
  );

  const requestSuggestions = useCallback(
    (query) => {
      if (typeof fetchSuggestions !== "function") {
        console.debug(
          "[address-capture] fetchSuggestions not provided; skipping",
          {
            query,
          }
        );
        return;
      }
      if (!query || query.trim().length < minSuggestLength) {
        console.debug("[address-capture] query too short for suggestions", {
          query,
          length: query ? query.trim().length : 0,
          minSuggestLength,
        });
        cancelPendingSuggestions();
        setSuggestions([]);
        setSuggestionsOpen(false);
        setHighlighted(-1);
        return;
      }
      // If user hasn't modified the accepted suggestion yet, don't reopen
      if (selectedSignatureRef.current) {
        const trimmed = query.trim();
        // if current input still starts with the accepted suggestion first token, or equals description, skip
        if (selectedSignatureRef.current === trimmed) {
          console.debug(
            "[address-capture] input matches accepted suggestion; not reopening"
          );
          return;
        }
      }
      console.debug("[address-capture] requesting suggestions", {
        query: query.trim(),
        minSuggestLength,
      });
      const requestId = ++suggestionRequestIdRef.current;
      setSuggesting(true);
      fetchSuggestions(query.trim())
        .then((list) => {
          if (requestId !== suggestionRequestIdRef.current) {
            return;
          }
          console.debug("[address-capture] suggestions response", {
            query: query.trim(),
            count: list.length,
          });
          setSuggestions(list.slice(0, suggestionLimit));
          setSuggestionsOpen(list.length > 0);
          setHighlighted(list.length > 0 ? 0 : -1);
        })
        .catch((error) => {
          if (requestId !== suggestionRequestIdRef.current) {
            return;
          }
          console.error("[address-capture] fetchSuggestions failed", error);
          if (typeof onError === "function") {
            onError(error);
          }
          setSuggestions([]);
          setSuggestionsOpen(false);
        })
        .finally(() => {
          if (requestId === suggestionRequestIdRef.current) {
            setSuggesting(false);
          }
        });
    },
    [
      fetchSuggestions,
      minSuggestLength,
      suggestionLimit,
      onError,
      cancelPendingSuggestions,
    ]
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
      // If user hasn't changed the value after selecting a suggestion, do not re-query
      if (
        selectedSignatureRef.current &&
        selectedSignatureRef.current === draft.line1.trim()
      ) {
        return;
      }
      console.debug(
        "[address-capture] debounce fired; will request suggestions",
        {
          line1Sample: draft.line1.slice(0, 60),
          length: draft.line1.length,
        }
      );
      requestSuggestions(draft.line1);
    }, suggestDebounceMs);
    return () => {
      if (debouncedQuery.current) {
        clearTimeout(debouncedQuery.current);
      }
    };
  }, [
    draft.line1,
    requestSuggestions,
    suggestDebounceMs,
    fetchSuggestions,
    disabled,
  ]);

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

  const handleLine1Blur = useCallback((e) => {
    const next = e.relatedTarget;
    if (!next || !suggestionsRef.current?.contains(next)) {
      setSuggestionsOpen(false);
    }
  }, []);

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
    const buttons = suggestionsRef.current.querySelectorAll("button[data-idx]");
    const target = buttons[highlighted];
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <div className={joinClasses(classes.container, className)}>
      <div className={classes.fieldWrapper}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label className={classes.label} htmlFor="address-line1">
            {fieldConfig.find((field) => field.key === "line1")?.label}
          </label>
          <span className={classes.badge}>Autocomplete</span>
        </div>
        <div className={classes.inputWrapper}>
          <input
            id="address-line1"
            name="address-line1"
            type="text"
            value={draft.line1}
            onChange={handleFieldChange("line1")}
            onKeyDown={handleKeyDown}
            onBlur={handleLine1Blur}
            disabled={disabled}
            placeholder={
              fieldConfig.find((field) => field.key === "line1")?.placeholder
            }
            autoComplete={
              fieldConfig.find((field) => field.key === "line1")?.autoComplete
            }
            className={classes.input}
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls="address-suggestions-list"
          />

          <Transition
            show={suggestionsOpen}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Dropdown
              suggestions={suggestions}
              suggestionsOpen={suggestionsOpen}
              highlighted={highlighted}
              onSelect={handleSuggestionSelect}
              onHover={setHighlighted}
              containerRef={suggestionsRef}
              classes={classes}
            />
          </Transition>
        </div>
        <p className={classes.hint}>
          {fieldConfig.find((field) => field.key === "line1")?.hint}
        </p>
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
              {errors[field.key] && (
                <p className={classes.error}>{errors[field.key]}</p>
              )}
            </div>
          ))}
      </div>

      {showPreview && (
        <div className={classes.preview}>
          <p className="text-xs font-semibold text-slate-600 mb-1">
            {copy.previewLabel}
          </p>
          <p className="text-sm text-slate-700">
            {formatAddressForDisplay(draft) || copy.previewEmpty}
          </p>
        </div>
      )}
    </div>
  );
};
