import { useCallback, useMemo } from "react";

export interface PageFilters {
  traceShow: string[];
  traceHide: string[];
  spanShow: string[];
  spanHide: string[];
  serviceShow: string[];
  serviceHide: string[];
  attrFilters: string;
  spanFilters: string;
  spanFiltersActive: boolean;
}

export interface Page {
  id: string;
  name: string;
  filters: PageFilters;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getDefaultPage(): Page {
  return {
    id: generateId(),
    name: "Default",
    filters: {
      traceShow: [],
      traceHide: [],
      spanShow: [],
      spanHide: [],
      serviceShow: [],
      serviceHide: [],
      attrFilters: "[]",
      spanFilters: "[]",
      spanFiltersActive: false,
    },
  };
}

function parsePagesFromUrl(searchParams: URLSearchParams): Page[] {
  const pagesParam = searchParams.get("pages");
  if (!pagesParam) {
    return [getDefaultPage()];
  }

  try {
    const pages = JSON.parse(decodeURIComponent(pagesParam));
    if (Array.isArray(pages) && pages.length > 0) {
      return pages;
    }
  } catch (e) {
    console.error("Failed to parse pages from URL:", e);
  }

  return [getDefaultPage()];
}

function encodePages(pages: Page[]): string {
  return encodeURIComponent(JSON.stringify(pages));
}

function getCurrentFilters(searchParams: URLSearchParams): PageFilters {
  return {
    traceShow: searchParams.get("traceShow")?.split(",").filter(Boolean) || [],
    traceHide: searchParams.get("traceHide")?.split(",").filter(Boolean) || [],
    spanShow: searchParams.get("spanShow")?.split(",").filter(Boolean) || [],
    spanHide: searchParams.get("spanHide")?.split(",").filter(Boolean) || [],
    serviceShow:
      searchParams.get("serviceShow")?.split(",").filter(Boolean) || [],
    serviceHide:
      searchParams.get("serviceHide")?.split(",").filter(Boolean) || [],
    attrFilters: searchParams.get("attrFilters") || "[]",
    spanFilters: searchParams.get("spanFilters") || "[]",
    spanFiltersActive: searchParams.get("spanFiltersActive") === "true",
  };
}

function applyFiltersToUrl(
  params: URLSearchParams,
  filters: PageFilters,
): void {
  if (filters.traceShow.length > 0) {
    params.set("traceShow", filters.traceShow.join(","));
  } else {
    params.delete("traceShow");
  }

  if (filters.traceHide.length > 0) {
    params.set("traceHide", filters.traceHide.join(","));
  } else {
    params.delete("traceHide");
  }

  if (filters.spanShow.length > 0) {
    params.set("spanShow", filters.spanShow.join(","));
  } else {
    params.delete("spanShow");
  }

  if (filters.spanHide.length > 0) {
    params.set("spanHide", filters.spanHide.join(","));
  } else {
    params.delete("spanHide");
  }

  if (filters.serviceShow.length > 0) {
    params.set("serviceShow", filters.serviceShow.join(","));
  } else {
    params.delete("serviceShow");
  }

  if (filters.serviceHide.length > 0) {
    params.set("serviceHide", filters.serviceHide.join(","));
  } else {
    params.delete("serviceHide");
  }

  if (filters.attrFilters !== "[]") {
    params.set("attrFilters", filters.attrFilters);
  } else {
    params.delete("attrFilters");
  }

  if (filters.spanFilters !== "[]") {
    params.set("spanFilters", filters.spanFilters);
  } else {
    params.delete("spanFilters");
  }

  if (filters.spanFiltersActive) {
    params.set("spanFiltersActive", "true");
  } else {
    params.delete("spanFiltersActive");
  }
}

export function usePages(
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void,
) {
  const pages = useMemo(
    () => parsePagesFromUrl(searchParams),
    [searchParams.get("pages")],
  );
  const currentPageId = searchParams.get("pageId") || pages[0]?.id;
  const currentPage = pages.find((p) => p.id === currentPageId) || pages[0];

  const updatePages = useCallback(
    (newPages: Page[], newCurrentPageId?: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("pages", encodePages(newPages));

        const pageId = newCurrentPageId || currentPageId;
        const page = newPages.find((p) => p.id === pageId) || newPages[0];

        if (page) {
          params.set("pageId", page.id);
          applyFiltersToUrl(params, page.filters);
        }

        return params;
      });
    },
    [currentPageId, setSearchParams],
  );

  const updateCurrentPageFilters = useCallback(() => {
    const currentFilters = getCurrentFilters(searchParams);
    const updatedPages = pages.map((p) =>
      p.id === currentPageId ? { ...p, filters: currentFilters } : p,
    );

    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("pages", encodePages(updatedPages));
      return params;
    });
  }, [pages, currentPageId, searchParams, setSearchParams]);

  const selectPage = useCallback(
    (page: Page) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("pageId", page.id);
        applyFiltersToUrl(params, page.filters);
        return params;
      });
    },
    [setSearchParams],
  );

  const createPage = useCallback(() => {
    const currentFilters = getCurrentFilters(searchParams);
    const newPage: Page = {
      id: generateId(),
      name: `Page ${pages.length + 1}`,
      filters: currentFilters,
    };

    updatePages([...pages, newPage], newPage.id);
  }, [pages, searchParams, updatePages]);

  const renamePage = useCallback(
    (pageId: string, newName: string) => {
      const updatedPages = pages.map((p) =>
        p.id === pageId ? { ...p, name: newName } : p,
      );
      updatePages(updatedPages);
    },
    [pages, updatePages],
  );

  const deletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) return;

      const filtered = pages.filter((p) => p.id !== pageId);
      const newCurrentPageId =
        currentPageId === pageId ? filtered[0].id : currentPageId;
      updatePages(filtered, newCurrentPageId);
    },
    [pages, currentPageId, updatePages],
  );

  return {
    pages,
    currentPage,
    selectPage,
    createPage,
    renamePage,
    deletePage,
    updateCurrentPageFilters,
  };
}
