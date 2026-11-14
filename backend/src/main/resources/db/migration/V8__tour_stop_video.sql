-- Video giới thiệu của điểm đến (tách khỏi cổ vật, hiển thị phía trên Nội dung văn hóa).
ALTER TABLE tour_stops ADD COLUMN IF NOT EXISTS video_url    VARCHAR(1000);
ALTER TABLE tour_stops ADD COLUMN IF NOT EXISTS video_source VARCHAR(20);

-- Chuyển video sẵn có: điểm đến chưa có video thì lấy video của cổ vật đầu tiên có video.
UPDATE tour_stops s
SET video_url    = a.video_url,
    video_source = a.video_source
FROM (
    SELECT DISTINCT ON (stop_id) stop_id, video_url, video_source
    FROM tour_stop_artifacts
    WHERE video_url IS NOT NULL AND video_url <> ''
    ORDER BY stop_id, sequence_order
) a
WHERE a.stop_id = s.id
  AND (s.video_url IS NULL OR s.video_url = '');
