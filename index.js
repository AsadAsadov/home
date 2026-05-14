const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', async (req, res) => {
    try {
        // 1. Ən çox baxılan videolar
        const { data: videos } = await supabase
            .from('videos')
            .select('*, accounts(username)')
            .order('view_count', { ascending: false })
            .limit(15);

        // 2. Bazadakı son trend musiqilər
        const { data: trends } = await supabase
            .from('global_trends')
            .select('*')
            .eq('trend_type', 'music')
            .order('growth_rate', { ascending: false })
            .limit(5);

        res.render('dashboard', { videos: videos || [], trends: trends || [] });
    } catch (err) {
        res.render('dashboard', { videos: [], trends: [] });
    }
});

app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    const rapidKey = process.env.RAPIDAPI_KEY;
    const rapidHost = 'tiktok-scraper7.p.rapidapi.com'; 

    try {
        const userRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/info', {
            params: { unique_id: username },
            headers: { 'x-rapidapi-key': rapidKey, 'x-rapidapi-host': rapidHost }
        });

        if (!userRes.data?.data) return res.status(404).send("İstifadəçi tapılmadı.");
        const userInfo = userRes.data.data.user;
        
        const postRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/posts', {
            params: { unique_id: username, count: '10' },
            headers: { 'x-rapidapi-key': rapidKey, 'x-rapidapi-host': rapidHost }
        });

        const posts = postRes.data.data?.videos || [];

        // 1. Account Upsert
        const { data: account } = await supabase
            .from('accounts')
            .upsert({ username, fullname: userInfo.nickname }, { onConflict: 'username' })
            .select().single();

        // 2. Video & Music Process
        if (posts.length > 0) {
            const videoData = posts.map(v => ({
                account_id: account.id,
                tiktok_id: v.video_id,
                caption: v.title || "",
                view_count: v.play_count || 0,
                like_count: v.digg_count || 0,
                share_count: v.share_count || 0,
                music_name: v.music_info?.title || "Original Sound",
                created_at: new Date(v.create_time * 1000).toISOString()
            }));

            await supabase.from('videos').upsert(videoData, { onConflict: 'tiktok_id' });

            // 3. Trend Analiz Məntiqi (Yalnız ən son video üçün)
            const latestVideo = posts;
            const engagementRate = ((latestVideo.digg_count + latestVideo.share_count) / latestVideo.play_count) * 100;

            // Əgər videonun etkileşimi (engagement) 10%-dən yuxarıdırsa, musiqini trendə at
            if (engagementRate > 10 && latestVideo.music_info?.title) {
                await supabase.from('global_trends').upsert({
                    trend_type: 'music',
                    trend_name: latestVideo.music_info.title,
                    trend_id: latestVideo.music_info.id,
                    growth_rate: engagementRate.toFixed(2),
                    trend_reason: `Yüksək etkileşim: %${engagementRate.toFixed(1)}`,
                    thumbnail: latestVideo.music_info.cover_medium
                }, { onConflict: 'trend_id' });
            }
        }

        res.redirect('/');
    } catch (error) {
        res.status(500).send("Texniki xəta: " + error.message);
    }
});

app.listen(3000);
