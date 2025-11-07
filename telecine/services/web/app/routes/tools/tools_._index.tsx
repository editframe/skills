import type { LoaderFunctionArgs } from 'react-router';
import type { MetaFunction } from 'react-router';
import {
  VideoCamera,
  Scissors,
  MusicNote,
  Image,
  ArrowsOut,
  PencilSimple,
  Columns,
  SpeakerHigh,
  Copy,
  ArrowClockwise,
  Plus,
} from '@phosphor-icons/react'
import classNames from 'classnames'

const iconColor = 'text-athens-gray-600 dark:text-white';

const tools = [
  {
    title: 'Add Music to Image',
    href: '/tools/add-music-to-image',
    icon: MusicNote,
    description: 'Add songs, music, MP3, or any audio to your image online.',
  },
  {
    title: "Add Audio to GIF",
    href: "/tools/add-music-to-gif",
    icon: MusicNote,
    description: "Add your favorite music to your GIFs online. Create awesome videos online by adding audio to your animated GIFs."
  },
  {
    title: "Online Video Editor",
    href: "/tools/video-editor",
    icon: VideoCamera,
    description: "Quickly edit and create amazing programmatically."
  },
  {
    title: 'Add Progress Bar or Waveform',
    href: '/tools/add-waveform-to-video',
    icon: SpeakerHigh,
    description: 'Add a waveform or progress bar dynamically to your video, gif, or audiogram.',
  },
  {
    title: 'Crop Video',
    href: '/tools/crop-video',
    icon: Scissors,
    description: 'Crop your video to fit TikTok, Instagram, Facebook, Youtube or any other video platform.',
  },
  {
    title: "Meme Maker",
    href: "/tools/meme-maker",
    icon: Plus,
    description: "Generate memes easily online.Simply add text, an image or a video to make a meme programmatically.",
  },
  {
    title: 'Image to Video',
    href: '/tools/image-to-video',
    icon: Image,
    description: 'Turn any image into a video.',
  },
  {
    title: 'Resize Video',
    href: '/tools/resize-video',
    icon: ArrowsOut,
    description: 'Make your video fit perfectly with a few clicks in square, rectangle, or wide aspect ratios.',
  },
  {
    title: "Add Music to Video",
    href: "/tools/add-music-to-video",
    icon: MusicNote,
    description: "Add songs, music, MP3, or any audio to your video."

  },
  {
    title: 'Add an Image or Photo to Video',
    href: '/tools/add-image-to-video',
    icon: PencilSimple,
    description: 'Add an image to your video, or add a logo or photo to your video. ',
  },
  {
    title: 'Promote Podcasts on Social Media',
    href: '/tools/promote-podcasts-on-social-media',
    icon: SpeakerHigh,
    description: 'Promote your podcast show across Instagram, TikTok, YouTube, Shorts or Reels by using our easy tool.',
  },
  {
    title: 'Share Audio to Social Media',
    href: '/tools/share-audio-to-social-media',
    icon: MusicNote,
    description: 'Quickly share your music, podcasts, or any audio on YouTube, Instagram, or TIkTok.',
  },
  {
    title: 'Add Text to Video',
    href: '/tools/add-text-to-video',
    icon: PencilSimple,
    description: 'Add text to your video at scale, quickly.',
  },
  {
    title: 'Apply Template to Video',
    href: '/tools/apply-template-to-video',
    icon: PencilSimple,
    description: 'Quickly create or use the perfect template to generate a video.',

  },
  {
    title: 'Mute Video',
    href: '/tools/mute-video',
    description: "Remove audio and sound from your video.",
    icon: MusicNote,
  },
  {
    title: 'Cut Video Online',
    href: '/tools/cut-video',
    icon: Scissors,
    description: 'Quickly cut your video to the perfect length. Select the ideal section and quickly trim the start and end of a video.',
  },
  {
    title: 'Watermark Video',
    href: '/tools/watermark-video',
    icon: Copy,
    description: 'Add watermark to your video online. You can watermark your videos using a logo, text, or branding.',
  },
  {
    title: "Logo Video Intro Maker",
    href: "/tools/logo-video-intro-maker",
    icon: Copy,
    description: "Add your logo to any video intro.",
  },
  {
    title: "Upload Audio to TikTok, Instagram, YouTube, Facebook, or Shorts",
    href: "/tools/upload-music-to-youtube",
    icon: MusicNote,
    description: "Add music to YouTube by making a video."
  },
  {
    title: 'Slideshow Maker',
    href: '/tools/slideshow-maker',
    icon: VideoCamera,
    description: 'Create a slideshow video using images, music, videos, or text.',
  },
  {
    title: 'Collage Maker',
    href: '/tools/collage-maker',
    icon: Columns,
    description: 'Make a collage with a few images, videos, or GIFs.',
  },
  {
    title: 'Video Merger',
    href: '/tools/merge-video',
    icon: ArrowClockwise,
    description: 'Join videos together and merge videos online by combining clips.',
  },
  {
    title: 'Split Screen Video Maker',
    href: '/tools/split-screen-video-maker',
    icon: Columns,
    description: 'Create clever split-screen videos and add music or text. Quickly create a side by side video on one screen.',
  },
  {
    title: 'Stack Videos on Top of Each Other',
    href: '/tools/video-overlay-online',
    icon: Plus,
    description: 'Overlay video on top of one another easily while also adding effects. Simply stack or combine two videos or more.',
  },
  {
    title: "Animate Objects in Video",
    description: "Animate any object in your video and give it life. Apply movement to text or images or stickers.",
    icon: ArrowClockwise,
    href: "/tools/animate-objects"
  },
  {
    title: 'Combine Video and Images',
    href: '/tools/combine-video-and-images',
    icon: Plus,
    description: 'Merge your videos and images online, and combine it all. Use any number of images and clips and combine them together.',
  },
  {
    title: 'Repeat Video',
    href: '/tools/repeat-video',
    icon: MusicNote,
    description: 'Repeat video over and over again to create a longer video.',
  },
  {
    title: 'Add Subtitles to Video',
    href: '/tools/add-subtitles-to-video',
    icon: MusicNote,
    description: 'Subtitle a video programmatically or with an SRT file of your choice.',
  }
]

export const loader = async (_: LoaderFunctionArgs) => {
  return null
};

export const meta: MetaFunction = () => {
  return [
    { title: "Editframe Tools" },
    {
      name: "description",
      content:
        "Explore our suite of video editing tools powered by Editframe.",
    },
  ];
};

export default function Tools() {
  return (
    <div
      className="mt-8 flex max-w-full flex-1 flex-col px-6 sm:container"
      tabIndex={-1}
    >
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-200">
        Tools 
      </h1>
      <p className="text-sm sm:text-md mt-2 sm:mt-4 text-gray-800 dark:text-gray-200">
        Welcome to the Editframe Tools section. Explore our powerful video editing tools. {tools.length} tools available.
      </p>
      <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <div
            key={tool.title}
            className="group relative dark:border dark:border-solid dark:border-neutral-800 bg-[#F6F6F7] dark:bg-[#202127] rounded-lg overflow-hidden"
          >
            <div className="p-4 sm:p-6">
              <div>
                <span
                  className={classNames(
                    iconColor,
                    'inline-flex rounded-lg p-2 sm:p-3 bg-[#8E96AA] dark:bg-[#65758529] bg-opacity-[0.16]'
                  )}
                >
                  <tool.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 sm:mt-8">
                <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100">
                  <a href={tool.href} className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    {tool.title}
                  </a>
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#3C3C43] text-opacity-[78%] dark:text-gray-400">
                  {tool.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
