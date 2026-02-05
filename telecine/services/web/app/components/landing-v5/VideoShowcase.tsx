/* ==============================================================================
   COMPONENT: VideoShowcase
   
   Purpose: Show real outputs. Videos made with Editframe. Proof that the
   tool produces professional results.
   
   Design: Clean grid with subtle shadows and hover effects
   ============================================================================== */

function VideoShowcase() {
  const videos = [
    { id: 1, title: 'Product Launch', category: 'Marketing', duration: '0:30' },
    { id: 2, title: 'Podcast Clip', category: 'Social', duration: '0:45' },
    { id: 3, title: 'Q3 Results', category: 'Data', duration: '1:15' },
    { id: 4, title: 'Tutorial Intro', category: 'Education', duration: '0:20' },
    { id: 5, title: 'Event Recap', category: 'Marketing', duration: '0:55' },
    { id: 6, title: 'Quote Card', category: 'Social', duration: '0:10' },
  ];
  
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <div 
          key={video.id} 
          className="group cursor-pointer bg-white dark:bg-[#111] rounded shadow-print hover:shadow-print-lg transition-shadow overflow-hidden"
        >
          <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
            {/* Play button */}
            <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-black/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-[var(--ink-black)] dark:text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            
            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-mono rounded">
              {video.duration}
            </div>
          </div>
          
          <div className="p-4 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm group-hover:text-[var(--accent-red)] transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-[var(--warm-gray)]">{video.category}</p>
            </div>
            <a href="#" className="text-xs font-medium text-[var(--accent-blue)] hover:underline">
              Code
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

export { VideoShowcase };
export default VideoShowcase;
