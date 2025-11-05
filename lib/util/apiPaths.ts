import type { OutputConfiguration } from "@editframe/api";

export const downloadRenderPath = (id: string, outputConfiguration: OutputConfiguration) => {
  return `/api/v1/renders/${id}.${outputConfiguration.fileExtension}`;
};

const webHost = import.meta.env.VITE_WEB_HOST;

export const downloadRenderURL = (id: string, outputConfiguration: OutputConfiguration) => {
  return `${webHost}${downloadRenderPath(id, outputConfiguration)}`;
};

export const downloadRenderBundlePath = (renderId: string) => {
  return `/api/v1/renders/${renderId}.tgz`;
};

export const downloadRenderBundleURL = (renderId: string) => {
  return `${webHost}${downloadRenderBundlePath(renderId)}`;
};