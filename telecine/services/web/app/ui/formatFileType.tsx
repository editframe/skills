enum FileType {
  Video = "video",
  Image = "image",
  Audio = "audio",
  Caption = "caption",
}

const isFileType = (fileType: string): fileType is FileType => {
  return Object.values(FileType).includes(fileType as FileType);
};

export const formatFileType = (fileType: string) => {
  if (!isFileType(fileType)) {
    return (
      <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600">
        {fileType.slice(0, 1).toUpperCase() + fileType.slice(1)}
      </span>
    );
  }
  if (fileType === "video") {
    return (
      <span className="inline-flex items-center rounded-md bg-mantis-100 px-2 py-1 text-xs font-medium text-mantis-700">
        Video
      </span>
    );
  }
  if (fileType === "image") {
    return (
      <span className="inline-flex items-center rounded-md bg-waikawa-gray-100 px-2 py-1 text-xs font-medium text-waikawa-gray-700">
        Image
      </span>
    );
  }
  if (fileType === "audio") {
    return (
      <span className="inline-flex items-center rounded-md bg-wewak-100 px-2 py-1 text-xs font-medium text-wewak-700">
        Audio
      </span>
    );
  }
  if (fileType === "caption") {
    return (
      <span className="inline-flex items-center rounded-md bg-mandy-100 px-2 py-1 text-xs font-medium text-mandy-700">
        Caption
      </span>
    );
  }
};
