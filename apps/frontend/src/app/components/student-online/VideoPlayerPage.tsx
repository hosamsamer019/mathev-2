import { useParams } from 'react-router-dom';
import UnifiedVideoPlayer from '../video/UnifiedVideoPlayer';

export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>();

  return (
    <UnifiedVideoPlayer
      lessonId={videoId || ''}
      backUrl="/student/online/courses"
      mode="online"
    />
  );
}
