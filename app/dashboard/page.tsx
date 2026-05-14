import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

// Types for video queue
type VideoQueueItem = {
  id: string;
  status: 'pending' | 'processing' | 'completed';
  bunny_url?: string; // Only present when status is completed
  created_at: string;
};

export async function fetchVideoQueue() {
  const { data, error } = await supabase
    .from("video_queue")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching video queue:", error);
    throw error;
  }
  return data;
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch video queue on mount
  useEffect(() => {
    async loadVideoQueue() {
      try {
        const data = await fetchVideoQueue();
        setVideos(data);
      } catch (err) {
        setError("Failed to load video queue");
      } finally {
        setLoading(false);
      }
    }
    loadVideoQueue();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Video Queue Dashboard</h1>
      
      {videos.length === 0 ? (
        <p className="text-center text-gray-500">No videos in queue</p>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <div key={video.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">Video {video.id.slice(0, 8)}...</h2>
                <span className={`px-2 py-1 text-xs rounded-full 
                  ${video.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'}`}>
                  {video.status}
                </span>
              </div>
              
              <p className="text-sm text-gray-500">
                Created: {new Date(video.created_at).toLocaleString()}
              </p>
              
              {video.status === 'completed' && video.bunny_url ? (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Preview:</h3>
                  {/* Simple video player using Bunny.net URL */}
                  <video 
                    controls 
                    className="w-full max-w-xs rounded"
                    src={video.bunny_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}