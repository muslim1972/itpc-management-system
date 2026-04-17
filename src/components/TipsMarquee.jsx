import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TipsMarquee = ({ appName = 'InfTeleKarbala' }) => {
  const [tips, setTips] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchAndSyncNews = async () => {
      try {
        // 1. Try to get news from local DB first
        const localRes = await fetch('/api/news');
        const localData = await localRes.json();
        
        // Check if we need to refresh from Supabase (session based)
        const isNewSession = !sessionStorage.getItem('news_synced');
        
        if (isNewSession || !localData.news) {
          // 2. Fetch from Supabase
          const { data, error } = await supabase
            .from('admin_tips')
            .select('content')
            .eq('app_name', appName)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          if (data?.content) {
            const newsContent = data.content;
            
            // 3. Save to local DB
            await fetch('/api/news', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: newsContent })
            });

            const tipsArray = newsContent.split('\n').map(t => t.trim()).filter(Boolean);
            setTips(tipsArray);
            sessionStorage.setItem('news_synced', 'true');
          }
        } else if (localData.news) {
          const tipsArray = localData.news.split('\n').map(t => t.trim()).filter(Boolean);
          setTips(tipsArray);
        }
      } catch (err) {
        console.error('Error syncing news:', err);
      }
    };

    fetchAndSyncNews();
  }, [appName]);

  if (tips.length === 0) return null;

  const marqueeText = tips.join('  ★★★★★  ');
  const duplicatedText = `${marqueeText}  ★★★★★  ${marqueeText}  ★★★★★  `;

  return (
    <div className="relative overflow-hidden bg-slate-900 border-b border-blue-500/20 h-10 w-full flex items-center marquee-container" dir="ltr">
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-900 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-900 to-transparent z-20 pointer-events-none" />

      <div className="flex whitespace-nowrap min-w-full marquee-wrapper">
        <div
          className="flex shrink-0 animate-marquee-rtl"
          style={{
            animationDuration: `${Math.max(duplicatedText.length * 0.1, 15)}s`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        >
          <span className="font-bold text-base text-blue-100 px-4 font-tajawal">
            {duplicatedText}
          </span>
          <span className="font-bold text-base text-blue-100 px-4 font-tajawal">
            {duplicatedText}
          </span>
        </div>
      </div>
      
      <style>{`
        @keyframes marquee-rtl {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-rtl {
          animation: marquee-rtl linear infinite;
        }
        .font-tajawal {
          font-family: 'Tajawal', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default TipsMarquee;
