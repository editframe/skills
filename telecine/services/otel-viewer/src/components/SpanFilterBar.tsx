import { useState, useRef, useEffect } from "react";

export interface SpanFilter {
  spanName: string;
  mode: "show" | "hide";
}

interface SpanFilterBarProps {
  spanFilters: SpanFilter[];
  onAddFilter: (filter: SpanFilter) => void;
  onRemoveFilter: (index: number) => void;
  onUpdateFilter: (index: number, filter: SpanFilter) => void;
  spanNames: string[];
  filtersActive: boolean;
  onToggleFiltersActive: () => void;
}

export function SpanFilterBar({
  spanFilters,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
  spanNames,
  filtersActive,
  onToggleFiltersActive,
}: SpanFilterBarProps) {
  const [newFilter, setNewFilter] = useState({
    spanName: "",
    mode: "hide" as SpanFilter["mode"],
  });
  const [showSpanDropdown, setShowSpanDropdown] = useState(false);
  const [spanSearchText, setSpanSearchText] = useState("");
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);
  const spanInputRef = useRef<HTMLInputElement>(null);
  const spanDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const filteredSpanNames = spanNames.filter((name) =>
    name.toLowerCase().includes(spanSearchText.toLowerCase()),
  );

  useEffect(() => {
    setSelectedDropdownIndex(-1);
  }, [spanSearchText]);

  useEffect(() => {
    if (selectedDropdownIndex >= 0 && showSpanDropdown) {
      dropdownItemRefs.current.get(selectedDropdownIndex)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedDropdownIndex, showSpanDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        spanDropdownRef.current &&
        !spanDropdownRef.current.contains(e.target as Node) &&
        spanInputRef.current &&
        !spanInputRef.current.contains(e.target as Node)
      ) {
        setShowSpanDropdown(false);
      }
    };

    if (showSpanDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSpanDropdown]);

  const handleAddFilter = () => {
    if (!newFilter.spanName) return;

    onAddFilter({
      spanName: newFilter.spanName,
      mode: newFilter.mode,
    });

    setNewFilter({
      spanName: "",
      mode: "hide",
    });
    setSpanSearchText("");
  };

  const handleSpanSelect = (name: string) => {
    setNewFilter({ ...newFilter, spanName: name });
    setSpanSearchText(name);
    setShowSpanDropdown(false);
  };

  const handleSpanInputChange = (value: string) => {
    setSpanSearchText(value);
    setNewFilter({ ...newFilter, spanName: value });
    setShowSpanDropdown(true);
  };

  const handleSpanInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showSpanDropdown || filteredSpanNames.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedDropdownIndex((prev) =>
        prev < filteredSpanNames.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedDropdownIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSpanNames.length - 1,
      );
    } else if (e.key === "Enter" && selectedDropdownIndex >= 0) {
      e.preventDefault();
      const selectedName = filteredSpanNames[selectedDropdownIndex];
      if (selectedName) {
        handleSpanSelect(selectedName);
      }
    } else if (e.key === "Escape") {
      setShowSpanDropdown(false);
      setSelectedDropdownIndex(-1);
    }
  };

  const toggleFilterMode = (index: number) => {
    const filter = spanFilters[index];
    if (filter) {
      onUpdateFilter(index, {
        ...filter,
        mode: filter.mode === "show" ? "hide" : "show",
      });
    }
  };

  return (
    <div className="span-filter-bar">
      <div className="span-filter-bar-label">Span Filters</div>
      <div className="span-filter-bar-builder">
        <div className="span-filter-combobox">
          <input
            ref={spanInputRef}
            type="text"
            placeholder="Span name..."
            value={spanSearchText}
            onChange={(e) => handleSpanInputChange(e.target.value)}
            onKeyDown={handleSpanInputKeyDown}
            onFocus={() => setShowSpanDropdown(true)}
            className="span-filter-bar-input"
            style={{ anchorName: "--span-filter-input" } as React.CSSProperties}
            autoComplete="off"
          />
          {showSpanDropdown && filteredSpanNames.length > 0 && (
            <div
              ref={spanDropdownRef}
              className="attr-filter-dropdown span-filter-dropdown-span"
            >
              {filteredSpanNames.map((name, index) => (
                <div
                  key={name}
                  ref={(el) => {
                    if (el) dropdownItemRefs.current.set(index, el);
                    else dropdownItemRefs.current.delete(index);
                  }}
                  className={`attr-filter-dropdown-item ${index === selectedDropdownIndex ? "selected" : ""}`}
                  onClick={() => handleSpanSelect(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="span-filter-bar-mode-toggle">
          <button
            className={`span-filter-bar-mode-btn ${newFilter.mode === "show" ? "active show" : ""}`}
            onClick={() => setNewFilter({ ...newFilter, mode: "show" })}
          >
            Show
          </button>
          <button
            className={`span-filter-bar-mode-btn ${newFilter.mode === "hide" ? "active hide" : ""}`}
            onClick={() => setNewFilter({ ...newFilter, mode: "hide" })}
          >
            Hide
          </button>
        </div>

        <button
          onClick={handleAddFilter}
          disabled={!newFilter.spanName}
          className="span-filter-bar-add-btn"
        >
          Add
        </button>

        {spanFilters.length > 0 && (
          <button
            onClick={onToggleFiltersActive}
            className={`span-filter-bar-toggle-btn ${filtersActive ? "active" : ""}`}
            title="Toggle filters"
          >
            {filtersActive ? "Active" : "Off"}
            <kbd className="kbd-shortcut">⌘J</kbd>
          </button>
        )}
      </div>

      {spanFilters.length > 0 && (
        <div className="span-filter-bar-active">
          {spanFilters.map((filter, index) => (
            <div key={index} className={`span-filter-chip ${filter.mode}`}>
              <button
                className="span-filter-chip-mode-btn"
                onClick={() => toggleFilterMode(index)}
                title={`Click to ${filter.mode === "show" ? "hide" : "show"} instead`}
              >
                {filter.mode === "show" ? "✓" : "✕"}
              </button>
              <span className="span-filter-chip-text">
                <strong>{filter.spanName}</strong>
              </span>
              <button
                onClick={() => onRemoveFilter(index)}
                className="span-filter-chip-remove"
                title="Remove filter"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
