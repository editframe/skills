import { HttpResponse, http } from "msw";
import type { Fixture } from "./fixture.js";

// --- Unified File API mocks ---

export const mockCreateFile = ({
  status = "created",
  id = "123",
  type = "image",
}: {
  status?: string;
  id?: string;
  type?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.post(
    "http://localhost:3000/api/v1/files",
    async () => {
      return HttpResponse.json({
        id,
        status,
        type,
        byte_size: null,
        md5: null,
        next_byte: 0,
      });
    },
    { once: true },
  );

export const mockLookupFileByMd5 = ({
  status = "ready",
  id = "123",
  md5 = "test-md5",
  type = "image",
}: {
  status?: string;
  id?: string;
  md5?: string;
  type?: string;
  fixture: Fixture;
}) =>
  http.get(`http://localhost:3000/api/v1/files/md5/${md5}`, async () => {
    return HttpResponse.json({
      id,
      status,
      type,
      byte_size: null,
      md5,
      next_byte: 0,
    });
  });

export const mockLookupFileByMd5NotFound = ({ md5 = "test-md5" }: { md5?: string }) =>
  http.get(`http://localhost:3000/api/v1/files/md5/${md5}`, async () => {
    return HttpResponse.json({}, { status: 404 });
  });

export const mockGetUploadFile = ({
  status = "ready",
  id = "123",
}: {
  status?: string;
  id?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.get(`http://localhost:3000/api/v1/files/${id}/upload`, async () => {
    return HttpResponse.json({
      id,
      status,
    });
  });

export const mockCreateFileTrack = ({
  complete = true,
  id = "123",
  fileId = "123",
}: {
  complete?: boolean;
  id?: string;
  fileId?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.post(
    `http://localhost:3000/api/v1/files/${fileId}/tracks`,
    async () => {
      return HttpResponse.json({
        id,
        complete,
        file_id: fileId,
        track_id: id,
        byte_size: 0,
        next_byte: 0,
      });
    },
    { once: true },
  );

export const mockGetFileTrackUpload = ({
  complete = true,
  fileId = "123",
  trackId = 1,
  id = "123",
}: {
  complete?: boolean;
  id?: string;
  fileId?: string;
  trackId?: number;
}) =>
  http.get(`http://localhost:3000/api/v1/files/${fileId}/tracks/${trackId}/upload`, async () => {
    return HttpResponse.json({
      id,
      complete,
    });
  });

export const mockUploadFileIndex = ({ id = "123" }: { id?: string }) =>
  http.post(
    `http://localhost:3000/api/v1/files/${id}/index/upload`,
    async () => {
      return HttpResponse.json({
        id,
        status: "ready",
      });
    },
    { once: true },
  );

// --- Legacy API mocks (kept for backward compatibility tests) ---

export const mockCreateImageFile = ({
  complete = true,
  id = "123",
}: {
  complete?: boolean;
  id?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.post(
    "http://localhost:3000/api/v1/image_files",
    async () => {
      return HttpResponse.json({
        id,
        complete,
      });
    },
    { once: true },
  );

export const mockLookupImageFileByMd5 = ({
  md5 = "test-md5",
}: {
  complete?: boolean;
  id?: string;
  md5?: string;
  fixture: Fixture;
}) =>
  http.get(`http://localhost:3000/api/v1/image_files/md5/${md5}`, async () => {
    return HttpResponse.json({
      id: "123",
      complete: true,
    });
  });

export const mockLookupImageFileByMd5NotFound = ({ md5 = "test-md5" }: { md5?: string }) =>
  http.get(`http://localhost:3000/api/v1/image_files/md5/${md5}`, async () => {
    return HttpResponse.json({}, { status: 404 });
  });

export const mockGetUploadImageFile = ({
  complete = true,
  id = "123",
  filename = "test.png",
}: {
  complete?: boolean;
  id?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.get(`http://localhost:3000/api/v1/image_files/${id}/upload`, async () => {
    return HttpResponse.json({
      id,
      complete,
      filename,
    });
  });

export const mockCreateIsobmffFile = ({
  complete = true,
  id = "123",
}: {
  complete?: boolean;
  id?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.post(
    "http://localhost:3000/api/v1/isobmff_files",
    async () => {
      return HttpResponse.json({
        id,
        fragment_index_complete: complete,
      });
    },
    { once: true },
  );

export const mockLookupISOBMFFFileByMd5 = ({
  complete = true,
  id = "123",
  md5 = "test-md5",
}: {
  complete?: boolean;
  id?: string;
  md5?: string;
  fixture: Fixture;
}) =>
  http.get(`http://localhost:3000/api/v1/isobmff_files/md5/${md5}`, async () => {
    return HttpResponse.json({
      id,
      complete,
    });
  });

export const mockLookupISOBMFFFileByMd5NotFound = ({ md5 = "test-md5" }: { md5?: string }) =>
  http.get(`http://localhost:3000/api/v1/isobmff_files/md5/${md5}`, async () => {
    return HttpResponse.json({}, { status: 404 });
  });

export const mockCreateIsobmffTrack = ({
  complete = true,
  id = "123",
  fileId = "123",
}: {
  complete?: boolean;
  id?: string;
  fileId?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.post(
    "http://localhost:3000/api/v1/isobmff_tracks",
    async () => {
      return HttpResponse.json({
        id,
        complete,
        file_id: fileId,
        track_id: id,
      });
    },
    { once: true },
  );

export const mockGetIsobmffTrackUpload = ({
  complete = true,
  fileId = "123",
  trackId = 1,
  id = "123",
}: {
  complete?: boolean;
  id?: string;
  fileId?: string;
  trackId?: number;
}) =>
  http.get(`http://localhost:3000/api/v1/isobmff_tracks/${fileId}/${trackId}/upload`, async () => {
    return HttpResponse.json({
      id,
      complete,
    });
  });
export const mockUploadIsobmffFileIndex = ({
  complete = true,
  id = "123",
}: {
  complete?: boolean;
  id?: string;
}) =>
  http.post(
    "http://localhost:3000/api/v1/isobmff_files/123/index/upload",
    async () => {
      return HttpResponse.json({
        id,
        complete,
      });
    },
    { once: true },
  );

export const mockLookupCaptionFileByMd5 = ({
  complete = true,
  id = "123",
  md5 = "test-md5",
}: {
  complete?: boolean;
  id?: string;
  md5?: string;
  fixture: Fixture;
}) =>
  http.get(`http://localhost:3000/api/v1/caption_files/md5/${md5}`, async () => {
    return HttpResponse.json({
      id,
      complete,
    });
  });

export const mockLookupCaptionFileByMd5NotFound = ({ md5 = "test-md5" }: { md5?: string }) =>
  http.get(`http://localhost:3000/api/v1/caption_files/md5/${md5}`, async () => {
    return HttpResponse.json({}, { status: 404 });
  });

export const mockCreateCaptionFile = ({
  complete = true,
  id = "123",
}: {
  complete?: boolean;
  id?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.post(
    "http://localhost:3000/api/v1/caption_files",
    async () => {
      return HttpResponse.json({
        id,
        complete,
      });
    },
    { once: true },
  );

export const mockUploadCaptionFile = ({
  complete = true,
  id = "123",
}: {
  complete?: boolean;
  id?: string;
  filename?: string;
  fixture: Fixture;
}) =>
  http.post(
    "http://localhost:3000/api/v1/caption_files/123/upload",
    async () => {
      return HttpResponse.json({
        id,
        complete,
      });
    },
    { once: true },
  );
