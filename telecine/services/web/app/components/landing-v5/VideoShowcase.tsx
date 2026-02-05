/* ==============================================================================
   COMPONENT: VideoShowcase
   
   Purpose: Show real outputs. Videos made with Editframe. Proof that the
   tool produces professional results.
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Grid layout with bold borders
   - Primary color accents
   - Geometric play buttons
   ============================================================================== */

function VideoShowcase() {
  const videos = [
    { id: 1, title: 'Product Launch', category: 'Marketing', duration: '0:30', color: 'red' as const },
    { id: 2, title: 'Podcast Clip', category: 'Social', duration: '0:45', color: 'blue' as const },
    { id: 3, title: 'Q3 Results', category: 'Data', duration: '1:15', color: 'yellow' as const },
    { id: 4, title: 'Tutorial Intro', category: 'Education', duration: '0:20', color: 'blue' as const },
    { id: 5, title: 'Event Recap', category: 'Marketing', duration: '0:55', color: 'red' as const },
    { id: 6, title: 'Quote Card', category: 'Social', duration: '0:10', color: 'yellow' as const },
  ];
  
  const colorMap = {
    red: 'bg-[var(--destijl-red)]',
    blue: 'bg-[var(--destijl-blue)]',
    yellow: 'bg-[var(--destijl-yellow)]',
  };
  
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0">
      {videos.map((video, i) => (
        <div 
          key={video.id} 
          className={`group cursor-pointer border-4 border-black dark:border-white ${
            i % 3 !== 0 ? 'lg:border-l-0' : ''
          } ${
            i >= 3 ? 'border-t-0' : ''
          } ${
            i % 2 !== 0 && i < 3 ? 'md:border-l-0 lg:border-l-4' : ''
          } ${
            i >= 2 && i < 3 ? 'md:border-t-0 lg:border-t-4' : ''
          }`}
        >
          <div className={`relative aspect-video ${colorMap[video.color]} flex items-center justify-center`} style={{boxShadow: 'inset 0 0 60px rgba(0,0,0,0.1)'}}>
            {/* Geometric play button */}
            <div className="w-16 h-16 bg-white flex items-center justify-center group-hover:bg-black transition-colors" style={{boxShadow: 'inset 0 0 15px rgba(0,0,0,0.05)'}}>
              <svg className="w-6 h-6 text-black group-hover:text-white ml-1 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            
            {/* Duration badge */}
            <div className="absolute bottom-0 right-0 px-3 py-2 bg-black text-white text-xs font-bold font-mono uppercase tracking-wider" style={{textShadow: '0 0 0.5px currentColor'}}>
              {video.duration}
            </div>
          </div>
          
          <div className="p-4 bg-white dark:bg-[#0a0a0a] flex items-start justify-between">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-xs mb-1 group-hover:text-[var(--destijl-red)] transition-colors">
                {video.title}
              </h3>
              <p className="text-[10px] uppercase tracking-wider opacity-60">{video.category}</p>
            </div>
            <a href="#" className="text-[10px] font-bold uppercase tracking-wider hover:text-[var(--destijl-blue)] transition-colors border-b-2 border-current">
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
