import debug from "debug";
import { SyncCaption } from "./SyncCaption.js";
import { SyncFragmentIndex } from "./SyncFragmentIndex.js";
import { SyncImage } from "./SyncImage.js";
import type { SyncStatus } from "./SyncStatus.js";
import { SyncTrack } from "./SyncTrack.js";

export interface SubAssetSync<CreationType> {
  icon: string;
  label: string;
  path: string;
  md5: string;
  prepare: () => Promise<void>;
  validate: () => Promise<void>;
  create: () => Promise<void>;
  upload: () => Promise<void>;
  syncStatus: SyncStatus;
  isComplete: () => boolean;
  markSynced: () => Promise<void>;
  created: CreationType | null;
}

const trackMatch = /\.track-[\d]+.mp4$/i;
const fragmentIndexMatch = /\.tracks.json$/i;
const captionsMatch = /\.captions.json$/i;
const imageMatch = /\.(png|jpe?g|gif|webp)$/i;

const log = debug("ef:SubAssetSync");

export const getAssetSync = (subAssetPath: string, md5: string) => {
  log("getAssetSync", { subAssetPath, md5 });
  if (imageMatch.test(subAssetPath)) {
    return new SyncImage(subAssetPath, md5);
  }
  if (trackMatch.test(subAssetPath)) {
    return new SyncTrack(subAssetPath, md5);
  }
  if (fragmentIndexMatch.test(subAssetPath)) {
    return new SyncFragmentIndex(subAssetPath, md5);
  }
  if (captionsMatch.test(subAssetPath)) {
    return new SyncCaption(subAssetPath, md5);
  }
  throw new Error(`Unrecognized sub-asset type: ${subAssetPath}`);
};
