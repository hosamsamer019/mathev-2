const fs = require('fs');
const files = [
  'd:/Mathe/Mathteachersmartplatform-main/apps/frontend/src/app/components/student-online/VideoPlayerPage.tsx',
  'd:/Mathe/Mathteachersmartplatform-main/apps/frontend/src/app/components/student-center/VideoPlayerPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('isDirectVideoUrl')) {
    content = content.replace(/import \{ isGoogleDriveUrl, getGoogleDrivePreviewUrl \} from '\.\.\/\.\.\/utils\/videoUtils';/, 
      "import { isGoogleDriveUrl, getGoogleDrivePreviewUrl } from '../../utils/videoUtils';\nconst isDirectVideoUrl = (url: string) => url.match(/\\.(mp4|webm|ogg|mov)(\\?.*)?$/i) !== null;");
  }

  if (!content.includes('initHtmlPlayer')) {
    const initHtmlStr = `
  const initHtmlPlayer = () => {
    const videoEl = document.getElementById('html-player') as HTMLVideoElement;
    if (!videoEl) return;
    
    playerRef.current = {
      getCurrentTime: () => videoEl.currentTime || 0,
      getDuration: () => videoEl.duration || 0,
      seekTo: (time: number) => { videoEl.currentTime = time; },
      pauseVideo: () => videoEl.pause(),
      playVideo: () => videoEl.play(),
    };

    videoEl.onplay = () => {
      setPlayerState(1);
      courseService.postLessonEvents(videoId!, { eventType: 'VIDEO_PLAYING' }).catch(console.error);
      if (activeQuizRef.current) {
        videoEl.pause();
        return;
      }
      if (!hasAutoResumed.current && maxTimeRef.current > 0 && videoEl.currentTime < 2) {
         hasAutoResumed.current = true;
         videoEl.currentTime = maxTimeRef.current;
      }
    };
    videoEl.onpause = () => {
      setPlayerState(2);
      courseService.postLessonEvents(videoId!, { eventType: 'VIDEO_PAUSED' }).catch(console.error);
    };
    videoEl.onended = () => {
      setPlayerState(0);
    };
  };`;

    content = content.replace(/(const initPlayer = \(\) => \{[\s\S]*?\}\;)/, `$1\n${initHtmlStr}`);
  }

  if (!content.includes('initHtmlPlayer()')) {
    content = content.replace(/if \(lesson && \(window as any\)\.YT && \(window as any\)\.YT\.Player\) \{/, 
      `if (lesson && isDirectVideoUrl(lesson.videoUrl)) {
      setTimeout(initHtmlPlayer, 100);
    } else if (lesson && (window as any).YT && (window as any).YT.Player) {`);
  }

  if (!content.includes('id="html-player"')) {
    content = content.replace(/<div id="yt-player" className="w-full h-full pointer-events-none" \/>/, 
      `isDirectVideoUrl(lesson.videoUrl) ? (
                      <video
                        id="html-player"
                        src={lesson.videoUrl}
                        className="w-full h-full object-contain pointer-events-none"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col pointer-events-auto z-[50]">
                        {lesson.videoUrl.match(/^.*(youtu\\.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/) ? (
                          <div id="yt-player" className="w-full h-full pointer-events-none" />
                        ) : (
                          <iframe
                            src={lesson.videoUrl}
                            className="w-full h-full border-0 rounded-xl pointer-events-auto"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                          ></iframe>
                        )}
                      </div>
                    )`);
  }
  
  if (content.includes('(!lesson?.videoUrl || !isGoogleDriveUrl(lesson.videoUrl))')) {
    content = content.replace(/\(!lesson\?\.videoUrl \|\| !isGoogleDriveUrl\(lesson\.videoUrl\)\) && \(/,
      `(!lesson?.videoUrl || (!isGoogleDriveUrl(lesson.videoUrl) && (isDirectVideoUrl(lesson.videoUrl) || !!lesson.videoUrl.match(/^.*(youtu\\.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/)))) && (`
    );
  }

  fs.writeFileSync(file, content);
});
