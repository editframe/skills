import { useState, useRef, useEffect } from "react";
import type { AttributeFilter } from "./FilterSidebar";

interface AttributeFilterBarProps {
  attributeFilters: AttributeFilter[];
  onAddFilter: (filter: AttributeFilter) => void;
  onRemoveFilter: (index: number) => void;
  onUpdateFilter: (index: number, filter: AttributeFilter) => void;
  spanNames: string[];
  spanAttributeKeys: Map<string, string[]>;
}

export function AttributeFilterBar({
  attributeFilters,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
  spanNames,
  spanAttributeKeys
}: AttributeFilterBarProps) {
  const [newFilter, setNewFilter] = useState({
    spanName: '',
    attributeKey: '',
    condition: 'exists' as AttributeFilter['condition'],
    value: '',
    mode: 'show' as AttributeFilter['mode']
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showSpanDropdown, setShowSpanDropdown] = useState(false);
  const [spanSearchText, setSpanSearchText] = useState('');
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);
  const spanInputRef = useRef<HTMLInputElement>(null);
  const spanDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [showAttrKeyDropdown, setShowAttrKeyDropdown] = useState(false);
  const [attrKeySearchText, setAttrKeySearchText] = useState('');
  const [selectedAttrKeyIndex, setSelectedAttrKeyIndex] = useState(-1);
  const attrKeyInputRef = useRef<HTMLInputElement>(null);
  const attrKeyDropdownRef = useRef<HTMLDivElement>(null);
  const attrKeyItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const filteredSpanNames = spanNames.filter(name =>
    name.toLowerCase().includes(spanSearchText.toLowerCase())
  );

  const availableAttributeKeys = newFilter.spanName
    ? spanAttributeKeys.get(newFilter.spanName) || []
    : [];

  const filteredAttrKeys = availableAttributeKeys.filter(key =>
    key.toLowerCase().includes(attrKeySearchText.toLowerCase())
  );

  useEffect(() => {
    setSelectedDropdownIndex(-1);
  }, [spanSearchText]);

  useEffect(() => {
    setSelectedAttrKeyIndex(-1);
  }, [attrKeySearchText]);

  useEffect(() => {
    if (selectedDropdownIndex >= 0 && showSpanDropdown) {
      dropdownItemRefs.current.get(selectedDropdownIndex)?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedDropdownIndex, showSpanDropdown]);

  useEffect(() => {
    if (selectedAttrKeyIndex >= 0 && showAttrKeyDropdown) {
      attrKeyItemRefs.current.get(selectedAttrKeyIndex)?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedAttrKeyIndex, showAttrKeyDropdown]);

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
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSpanDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attrKeyDropdownRef.current &&
        !attrKeyDropdownRef.current.contains(e.target as Node) &&
        attrKeyInputRef.current &&
        !attrKeyInputRef.current.contains(e.target as Node)
      ) {
        setShowAttrKeyDropdown(false);
      }
    };

    if (showAttrKeyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAttrKeyDropdown]);

  const handleAddFilter = () => {
    if (!newFilter.spanName || !newFilter.attributeKey) return;

    onAddFilter({
      spanName: newFilter.spanName,
      attributeKey: newFilter.attributeKey,
      condition: newFilter.condition,
      value: newFilter.value,
      mode: newFilter.mode
    });

    setNewFilter({
      spanName: '',
      attributeKey: '',
      condition: 'exists',
      value: '',
      mode: 'show'
    });
    setSpanSearchText('');
    setAttrKeySearchText('');
  };

  const handleSpanSelect = (name: string) => {
    setNewFilter({ ...newFilter, spanName: name, attributeKey: '' });
    setSpanSearchText(name);
    setAttrKeySearchText('');
    setShowSpanDropdown(false);
  };

  const handleSpanInputChange = (value: string) => {
    setSpanSearchText(value);
    setNewFilter({ ...newFilter, spanName: value });
    setShowSpanDropdown(true);
  };

  const handleSpanInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showSpanDropdown || filteredSpanNames.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedDropdownIndex(prev =>
        prev < filteredSpanNames.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedDropdownIndex(prev =>
        prev > 0 ? prev - 1 : filteredSpanNames.length - 1
      );
    } else if (e.key === 'Enter' && selectedDropdownIndex >= 0) {
      e.preventDefault();
      const selectedName = filteredSpanNames[selectedDropdownIndex];
      if (selectedName) {
        handleSpanSelect(selectedName);
      }
    } else if (e.key === 'Escape') {
      setShowSpanDropdown(false);
      setSelectedDropdownIndex(-1);
    }
  };

  const handleAttrKeySelect = (key: string) => {
    setNewFilter({ ...newFilter, attributeKey: key });
    setAttrKeySearchText(key);
    setShowAttrKeyDropdown(false);
  };

  const handleAttrKeyInputChange = (value: string) => {
    setAttrKeySearchText(value);
    setNewFilter({ ...newFilter, attributeKey: value });
    if (availableAttributeKeys.length > 0) {
      setShowAttrKeyDropdown(true);
    }
  };

  const handleAttrKeyInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showAttrKeyDropdown || filteredAttrKeys.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedAttrKeyIndex(prev =>
        prev < filteredAttrKeys.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedAttrKeyIndex(prev =>
        prev > 0 ? prev - 1 : filteredAttrKeys.length - 1
      );
    } else if (e.key === 'Enter' && selectedAttrKeyIndex >= 0) {
      e.preventDefault();
      const selectedKey = filteredAttrKeys[selectedAttrKeyIndex];
      if (selectedKey) {
        handleAttrKeySelect(selectedKey);
      }
    } else if (e.key === 'Escape') {
      setShowAttrKeyDropdown(false);
      setSelectedAttrKeyIndex(-1);
    }
  };

  const toggleFilterMode = (index: number) => {
    const filter = attributeFilters[index];
    if (filter) {
      onUpdateFilter(index, {
        ...filter,
        mode: filter.mode === 'show' ? 'hide' : 'show'
      });
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
  };

  const saveEdit = (index: number, updates: Partial<AttributeFilter>) => {
    const filter = attributeFilters[index];
    if (filter) {
      onUpdateFilter(index, {
        ...filter,
        ...updates
      });
    }
    setEditingIndex(null);
  };

  return (
    <div className="attr-filter-bar">
      <div className="attr-filter-bar-label">Attribute Filters</div>
      <div className="attr-filter-bar-builder">
        <div className="attr-filter-combobox">
          <input
            ref={spanInputRef}
            type="text"
            placeholder="Span name..."
            value={spanSearchText}
            onChange={(e) => handleSpanInputChange(e.target.value)}
            onKeyDown={handleSpanInputKeyDown}
            onFocus={() => setShowSpanDropdown(true)}
            className="attr-filter-bar-input"
            style={{ anchorName: '--span-input' } as React.CSSProperties}
            autoComplete="off"
          />
          {showSpanDropdown && filteredSpanNames.length > 0 && (
            <div ref={spanDropdownRef} className="attr-filter-dropdown attr-filter-dropdown-span">
              {filteredSpanNames.map((name, index) => (
                <div
                  key={name}
                  ref={(el) => {
                    if (el) dropdownItemRefs.current.set(index, el);
                    else dropdownItemRefs.current.delete(index);
                  }}
                  className={`attr-filter-dropdown-item ${index === selectedDropdownIndex ? 'selected' : ''}`}
                  onClick={() => handleSpanSelect(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="attr-filter-combobox">
          <input
            ref={attrKeyInputRef}
            type="text"
            placeholder="Attribute key"
            value={attrKeySearchText}
            onChange={(e) => handleAttrKeyInputChange(e.target.value)}
            onKeyDown={handleAttrKeyInputKeyDown}
            onFocus={() => availableAttributeKeys.length > 0 && setShowAttrKeyDropdown(true)}
            className="attr-filter-bar-input"
            style={{ anchorName: '--attr-key-input' } as React.CSSProperties}
            autoComplete="off"
          />
          {showAttrKeyDropdown && filteredAttrKeys.length > 0 && (
            <div ref={attrKeyDropdownRef} className="attr-filter-dropdown attr-filter-dropdown-attr-key">
              {filteredAttrKeys.map((key, index) => (
                <div
                  key={key}
                  ref={(el) => {
                    if (el) attrKeyItemRefs.current.set(index, el);
                    else attrKeyItemRefs.current.delete(index);
                  }}
                  className={`attr-filter-dropdown-item ${index === selectedAttrKeyIndex ? 'selected' : ''}`}
                  onClick={() => handleAttrKeySelect(key)}
                >
                  {key}
                </div>
              ))}
            </div>
          )}
        </div>

        <select
          value={newFilter.condition}
          onChange={(e) => setNewFilter({ ...newFilter, condition: e.target.value as AttributeFilter['condition'] })}
          className="attr-filter-bar-input"
        >
          <option value="exists">Has value</option>
          <option value="missing">Missing/null</option>
          <option value="equals">Equals</option>
          <option value="notEquals">Not equals</option>
        </select>

        {(newFilter.condition === 'equals' || newFilter.condition === 'notEquals') && (
          <input
            type="text"
            placeholder="Value"
            value={newFilter.value}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
            className="attr-filter-bar-input"
          />
        )}

        <div className="attr-filter-bar-mode-toggle">
          <button
            className={`attr-filter-bar-mode-btn ${newFilter.mode === 'show' ? 'active show' : ''}`}
            onClick={() => setNewFilter({ ...newFilter, mode: 'show' })}
          >
            Show
          </button>
          <button
            className={`attr-filter-bar-mode-btn ${newFilter.mode === 'hide' ? 'active hide' : ''}`}
            onClick={() => setNewFilter({ ...newFilter, mode: 'hide' })}
          >
            Hide
          </button>
        </div>

        <button
          onClick={handleAddFilter}
          disabled={!newFilter.spanName || !newFilter.attributeKey}
          className="attr-filter-bar-add-btn"
        >
          Add
        </button>
      </div>

      {attributeFilters.length > 0 && (
        <div className="attr-filter-bar-active">
          {attributeFilters.map((filter, index) => {
            const isEditing = editingIndex === index;

            if (isEditing) {
              return (
                <div key={index} className="attr-filter-chip-editor">
                  <select
                    value={filter.condition}
                    onChange={(e) => saveEdit(index, { condition: e.target.value as AttributeFilter['condition'] })}
                    className="attr-filter-chip-edit-input"
                    autoFocus
                  >
                    <option value="exists">Has value</option>
                    <option value="missing">Missing/null</option>
                    <option value="equals">Equals</option>
                    <option value="notEquals">Not equals</option>
                  </select>
                  {(filter.condition === 'equals' || filter.condition === 'notEquals') && (
                    <input
                      type="text"
                      value={filter.value || ''}
                      onChange={(e) => saveEdit(index, { value: e.target.value })}
                      placeholder="Value"
                      className="attr-filter-chip-edit-input"
                    />
                  )}
                  <button
                    onClick={() => setEditingIndex(null)}
                    className="attr-filter-chip-edit-done"
                  >
                    Done
                  </button>
                </div>
              );
            }

            return (
              <div
                key={index}
                className={`attr-filter-chip ${filter.mode}`}
              >
                <button
                  className="attr-filter-chip-mode-btn"
                  onClick={() => toggleFilterMode(index)}
                  title={`Click to ${filter.mode === 'show' ? 'hide' : 'show'} instead`}
                >
                  {filter.mode === 'show' ? '✓' : '✕'}
                </button>
                <span
                  className="attr-filter-chip-text"
                  onClick={() => startEditing(index)}
                  title="Click to edit"
                >
                  <strong>{filter.spanName}</strong> · {filter.attributeKey} {filter.condition}
                  {filter.value && ` "${filter.value}"`}
                </span>
                <button
                  onClick={() => onRemoveFilter(index)}
                  className="attr-filter-chip-remove"
                  title="Remove filter"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
