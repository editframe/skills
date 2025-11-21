import React from "react";

export const TextSegment = () => <ef-text-segment />;

export const elementRegistry = {
  text: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  image: ({ ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
  video: ({ children, ...props }: React.VideoHTMLAttributes<HTMLVideoElement>) => (
    <video {...props}>{children}</video>
  ),
  timegroup: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
} as const;



