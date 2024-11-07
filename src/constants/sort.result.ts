import type { IFolder } from "@/interfaces/folder.interface.js";

type FolderSortActions = Record<string, (a: IFolder, b: IFolder) => number>;

export const FOLDER_SORT: FolderSortActions = {
  path: (a: IFolder, b: IFolder) => (a.path > b.path ? 1 : -1),
  size: (a: IFolder, b: IFolder) => (a.size < b.size ? 1 : -1),
  "last-mod": (a: IFolder, b: IFolder) => {
    if (a.modificationTime === b.modificationTime) {
      return FOLDER_SORT["path"]!(a, b);
    }

    if (!a.modificationTime && b.modificationTime) {
      return 1;
    }

    if (!b.modificationTime && a.modificationTime) {
      return -1;
    }

    return a.modificationTime - b.modificationTime;
  },
};
