import { useState, useRef, useEffect } from "react";

export interface Page {
  id: string;
  name: string;
  filters: {
    traceShow: string[];
    traceHide: string[];
    spanShow: string[];
    spanHide: string[];
    serviceShow: string[];
    serviceHide: string[];
    attributeFilters: string;
  };
}

interface PageTabsProps {
  currentPage: Page | null;
  pages: Page[];
  onPageSelect: (page: Page) => void;
  onPageCreate: () => void;
  onPageRename: (pageId: string, newName: string) => void;
  onPageDelete: (pageId: string) => void;
}

export function PageTabs({
  currentPage,
  pages,
  onPageSelect,
  onPageCreate,
  onPageRename,
  onPageDelete,
}: PageTabsProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPageId]);

  const handleStartEdit = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditName(page.name);
  };

  const handleSaveEdit = () => {
    if (editingPageId && editName.trim()) {
      onPageRename(editingPageId, editName.trim());
    }
    setEditingPageId(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setEditingPageId(null);
    setEditName("");
  };

  const handleDelete = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this page?")) {
      onPageDelete(pageId);
    }
  };

  return (
    <div className="page-tabs">
      <div className="page-tabs-scroll">
        {pages.map((page) => {
          const isActive = currentPage?.id === page.id;
          const isEditing = editingPageId === page.id;

          return (
            <div
              key={page.id}
              className={`page-tab ${isActive ? 'active' : ''}`}
              onClick={() => !isEditing && onPageSelect(page)}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  onBlur={handleSaveEdit}
                  className="page-tab-edit-input"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className="page-tab-name"
                    onDoubleClick={(e) => handleStartEdit(page, e)}
                  >
                    {page.name}
                  </span>
                  {pages.length > 1 && (
                    <button
                      className="page-tab-delete"
                      onClick={(e) => handleDelete(page.id, e)}
                      title="Delete page"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
        <button className="page-tab-new" onClick={onPageCreate} title="New page">
          +
        </button>
      </div>
    </div>
  );
}
