const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.use(express.static('public'));

const RAPID_HOST = 'tiktok-scraper7.p.rapidapi.com';

app.get('/', async (req, res) => {
    try {
        const { data: videos } = await supabase.from('videos').select('*, accounts(username)').order('view_count', { ascending: false }).limit(10);
        const { data: trends } = await supabase.from('global_trends').select('*').order('growth_rate', { ascending: false }).limit(10);
        res.render('dashboard', { videos: videos || [], trends: trends || [] });
    } catch (err) {
        res.render('dashboard', { videos: [], trends: [] });
    }
});

// KƏŞF ET DÜYMƏSİ ÜÇÜN REAL-TIME TRENDLƏR
app.get('/fetch-global-trends', async (req, res) => {
    try {
        console.log("🌍 Qlobal trendlər çəkilir...");
        const response = await axios.get(`https://${RAPID_HOST}/feed/trend`, {
            params: { region: 'TR', count: '10' }, 
            headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': RAPID_HOST }
        });

        const trendingVideos = response.data.data.videos || [];

        for (let v of trendingVideos) {
            const views = v.play_count || 1;
            const engagement = ((v.digg_count + v.share_count) / views) * 100;
            
            // TREND SƏBƏBİ LOGİKASI
            let reason = "Stabil Artım";
            if (engagement > 15) reason = "Yüksək Reaksiya: İnsanlar bu musiqini çox bəyənir.";
            if (v.share_count > 10000) reason = "Viral Paylaşım: Son saatlarda minlərlə adam paylaşıb.";
            if (v.comment_count > 5000) reason = "Müzakirə Mövzusu: Video altında böyük aktivlik var.";

            await supabase.from('global_trends').upsert({
                trend_type: 'music',
                trend_name: v.music_info.title,
                trend_id: v.music_info.id,
                growth_rate: engagement.toFixed(2),
                trend_reason: reason,
                thumbnail: v.music_info.cover_medium || v.music_info.cover_large
            }, { onConflict: 'trend_id' });
        }
        res.redirect('/');
    } catch (error) {
        console.error("Xəta:", error.message);
        res.status(500).send("Trend xətası: " + error.message);
    }
});

app.listen(process.env.PORT || 3000);
