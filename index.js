const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.use(express.static('public'));

const RAPID_HOST = 'tiktok-scraper7.p.rapidapi.com';

// ANA SƏHİFƏ
app.get('/', async (req, res) => {
    try {
        const { data: videos } = await supabase
            .from('videos')
            .select('*, accounts(username)')
            .order('created_at', { ascending: false })
            .limit(15);

        const { data: trends } = await supabase
            .from('global_trends')
            .select('*')
            .order('growth_rate', { ascending: false })
            .limit(12);

        res.render('dashboard', { videos: videos || [], trends: trends || [] });
    } catch (err) {
        res.render('dashboard', { videos: [], trends: [] });
    }
});

// 1. PROFİL ANALİZİ
app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const userRes = await axios.get(`https://${RAPID_HOST}/user/info`, {
            params: { unique_id: username },
            headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': RAPID_HOST }
        });

        if (!userRes.data?.data) return res.status(404).send("İstifadəçi tapılmadı.");
        const userObj = userRes.data.data.user;

        const postRes = await axios.get(`https://${RAPID_HOST}/user/posts`, {
            params: { unique_id: username, count: '12' },
            headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': RAPID_HOST }
        });

        const posts = postRes.data.data?.videos || [];

        const { data: account } = await supabase.from('accounts').upsert({ 
            username, fullname: userObj.nickname 
        }, { onConflict: 'username' }).select().single();

        if (posts.length > 0) {
            const videoData = posts.map(v => ({
                account_id: account.id,
                tiktok_id: v.video_id,
                caption: v.title || "Açıqlama yoxdur",
                view_count: v.play_count || 0,
                like_count: v.digg_count || 0,
                share_count: v.share_count || 0,
                music_name: v.music_info?.title || "Səs məlumatı yoxdur",
                created_at: new Date(v.create_time * 1000).toISOString()
            }));
            await supabase.from('videos').upsert(videoData, { onConflict: 'tiktok_id' });
        }
        res.redirect('/');
    } catch (error) {
        res.status(500).send("Analiz xətası: " + error.message);
    }
});

// 2. TRENDLƏRİ ÇƏK (Musiqi Adı Problemi Həll Olunub)
app.get('/fetch-global-trends', async (req, res) => {
    try {
        const response = await axios.get(`https://${RAPID_HOST}/user/posts`, {
            params: { unique_id: 'tiktok', count: '15' }, 
            headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': RAPID_HOST }
        });

        const trendingVideos = response.data.data.videos || [];

        for (let v of trendingVideos) {
            const engagement = (((v.digg_count + v.share_count) / (v.play_count || 1)) * 100).toFixed(2);
            
            // Əgər musiqi adı "original sound" dursa, videonun başlığını istifadə edirik
            let displayTitle = v.music_info.title;
            if (displayTitle.toLowerCase().includes("original sound")) {
                displayTitle = v.title ? v.title.substring(0, 30) + "..." : displayTitle;
            }

            await supabase.from('global_trends').upsert({
                trend_type: 'music',
                trend_name: displayTitle,
                trend_id: v.music_info.id,
                growth_rate: engagement,
                trend_reason: v.digg_count > 100000 ? "Viral Reaksiya" : "Sürətli Artım",
                thumbnail: v.music_info.cover_medium || v.origin_cover
            }, { onConflict: 'trend_id' });
        }
        res.redirect('/');
    } catch (error) {
        res.status(500).send("Trend xətası: " + error.message);
    }
});

// 3. MUSİQİYƏ KLİKLƏYƏNDƏ SON 5 VİDEO
app.get('/music-trends/:musicId', async (req, res) => {
    try {
        const { musicId } = req.params;
        const response = await axios.get(`https://${RAPID_HOST}/music/posts`, {
            params: { music_id: musicId, count: '5' },
            headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': RAPID_HOST }
        });
        res.json(response.data.data.videos || []);
    } catch (error) {
        res.status(500).json({ error: "Məlumat alınmadı" });
    }
});

app.listen(process.env.PORT || 3000);
