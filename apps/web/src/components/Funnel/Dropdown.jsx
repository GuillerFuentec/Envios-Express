"use client";

import { forwardRef, useCallback } from "react";
import { Menu, MenuItem, MenuItems } from "@headlessui/react";
import clsx from "clsx";

const DEFAULT_CONTAINER_CLASSES =
  "absolute z-50 left-0 right-0 top-full mt-2 max-h-72 overflow-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10";
const DEFAULT_BUTTON_CLASSES =
  "flex w-full flex-col gap-0.5 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-300 dark:hover:bg-white/5 dark:focus:bg-white/5";
const DEFAULT_ACTIVE_CLASSES =
  "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white";
const DEFAULT_PRIMARY_CLASSES =
  "font-medium text-gray-800 dark:text-gray-100 truncate";
const DEFAULT_SECONDARY_CLASSES =
  "text-xs text-gray-500 dark:text-gray-400 truncate";

const assignRef = (ref, value) => {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
  } else {
    ref.current = value;
  }
};

const getSuggestionKey = (suggestion, index) =>
  suggestion?.id ??
  suggestion?.placeId ??
  suggestion?.place_id ??
  suggestion?.value ??
  suggestion?.description ??
  `suggestion-${index}`;

const getFormatting = (suggestion) =>
  suggestion?.structuredFormatting || suggestion?.structured_formatting;

const getPrimaryText = (suggestion) => {
  const formatting = getFormatting(suggestion);
  return (
    suggestion?.label ??
    suggestion?.primaryText ??
    formatting?.main_text ??
    suggestion?.description ??
    suggestion?.terms?.[0]?.value ??
    ""
  );
};

const getSecondaryText = (suggestion) => {
  const formatting = getFormatting(suggestion);
  if (suggestion?.secondary) return suggestion.secondary;
  if (suggestion?.secondaryText) return suggestion.secondaryText;
  if (formatting?.secondary_text) return formatting.secondary_text;
  if (suggestion?.terms && suggestion.terms.length > 1) {
    return suggestion.terms
      .slice(1)
      .map((term) => term.value || term)
      .join(", ");
  }
  return "";
};

export const Dropdown = forwardRef(function Dropdown(
  {
    suggestions = [],
    suggestionsOpen = false,
    highlighted = -1,
    onSelect,
    onHover,
    containerRef,
    classes = {},
  },
  forwardedRef
) {
  const hasSuggestions = suggestionsOpen && suggestions.length > 0;

  const setRefs = useCallback(
    (node) => {
      assignRef(containerRef, node);
      assignRef(forwardedRef, node);
    },
    [containerRef, forwardedRef]
  );

  const containerClasses = classes.suggestions || DEFAULT_CONTAINER_CLASSES;
  const buttonClasses = classes.suggestionButton || DEFAULT_BUTTON_CLASSES;
  const activeClasses =
    classes.suggestionButtonActive || DEFAULT_ACTIVE_CLASSES;
  const primaryClasses = classes.suggestionPrimary || DEFAULT_PRIMARY_CLASSES;
  const secondaryClasses =
    classes.suggestionSecondary || DEFAULT_SECONDARY_CLASSES;

  return (
    <Menu as="div" className="relative block w-full">
      <MenuItems
        static
        ref={setRefs}
        role="listbox"
        id="address-suggestions-list"
        className={clsx(
          containerClasses,
          hasSuggestions ? "block" : "hidden"
        )}
        aria-hidden={!hasSuggestions}
      >
        <div className="py-1" data-testid="address-suggestions">
          {suggestions.map((suggestion, index) => {
            const primaryText = getPrimaryText(suggestion);
            const secondaryText = getSecondaryText(suggestion);
            return (
              <MenuItem key={getSuggestionKey(suggestion, index)}>
                {({ focus }) => (
                  <button
                    type="button"
                    data-idx={index}
                    onClick={() => onSelect?.(suggestion)}
                    onMouseEnter={() => onHover?.(index)}
                    className={clsx(
                      buttonClasses,
                      (focus || highlighted === index) && activeClasses
                    )}
                  >
                    <span className={primaryClasses}>
                      {primaryText || "Sin descripción"}
                    </span>
                    {secondaryText && (
                      <span className={secondaryClasses}>{secondaryText}</span>
                    )}
                  </button>
                )}
              </MenuItem>
            );
          })}
        </div>
      </MenuItems>
    </Menu>
  );
});
