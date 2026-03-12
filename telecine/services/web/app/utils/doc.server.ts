import {
  getLocalFile,
  getLocalContent,
  getAllGuideFiles,
  getAllBlogFiles,
  getAllChangelogsFiles,
  getAllDocsFiles,
  getBlogFile,
  getChangelogFile,
} from "./fs.server";

export { getBlogFile, getChangelogFile };

export const getFile = async (path: string): Promise<string> => {
  return getLocalFile(path);
};

export const getContent = async (path: string) => {
  try {
    return getLocalContent(path);
  } catch (error: any) {
    if (error.code?.includes("ENOENT")) {
      throw new Error("Not found");
    }
    throw error;
  }
};

export const getAllDocsContent = async () => {
  try {
    return await getAllDocsFiles();
  } catch (error: any) {
    if (error.code?.includes("ENOENT")) {
      throw new Error("Not found");
    }
    throw error;
  }
};

export const getAllGuidesContent = async () => {
  try {
    return await getAllGuideFiles();
  } catch (error: any) {
    if (error.code?.includes("ENOENT")) {
      throw new Error("Not found");
    }
    throw error;
  }
};

export const getAllChangelogsContent = async () => {
  try {
    return await getAllChangelogsFiles();
  } catch (error: any) {
    if (error.code?.includes("ENOENT")) {
      throw new Error("Not found");
    }
    throw error;
  }
};

export const getAllBlogsContent = async () => {
  try {
    return await getAllBlogFiles();
  } catch (error: any) {
    if (error.code?.includes("ENOENT")) {
      throw new Error("Not found");
    }
    throw error;
  }
};
