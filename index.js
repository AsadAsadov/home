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
                comment_count: v.comment_count || 0,
                music_name: v.music_info?.title || "Səs məlumatı yoxdur",
                video_url: `https://www.tiktok.com/@${username}/video/${v.video_id}`,
                created_at: new Date(v.create_time * 1000).toISOString()
            }));
            await supabase.from('videos').upsert(videoData, { onConflict: 'tiktok_id' });
        }
        res.redirect('/');
    } catch (error) {
        res.status(500).send("Analiz xətası: " + error.message);
    }
});

// 2. TRENDLƏRİ ÇƏK
app.get('/fetch-global-trends', async (req, res) => {
    try {
        const response = await axios.get(`https://${RAPID_HOST}/user/posts`, {
            params: { unique_id: 'tiktok', count: '15' }, 
            headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': RAPID_HOST }
        });

        const trendingVideos = response.data.data.videos || [];

        for (let v of trendingVideos) {
            const engagement = (((v.digg_count + v.share_count) / (v.play_count || 1)) * 100).toFixed(2);
            
            let displayTitle = v.music_info.title;
            if (displayTitle.toLowerCase().includes("original sound")) {
                displayTitle = `${v.music_info.author} (Original)`;
            }

            await supabase.from('global_trends').upsert({
                trend_type: 'music',
                trend_name: displayTitle,
                trend_id: v.music_info.id,
                growth_rate: engagement,
                trend_reason: v.play_count > 1000000 ? "🔥 Milyonluq" : "🚀 Sürətli",
                thumbnail: v.music_info.cover_medium || v.origin_cover,
                author_name: v.music_info.author
            }, { onConflict: 'trend_id' });
        }
        res.redirect('/');
    } catch (error) {
        res.status(500).send("Trend xətası: " + error.message);
    }
});

// 3. MUSİQİYƏ KLİKLƏYƏNDƏ VİRAL ANALİZ (YENİLƏNDİ)
app.get('/music-trends/:musicId', async (req, res) => {
    try {
        const { musicId } = req.params;
        const response = await axios.get(`https://${RAPID_HOST}/music/posts`, {
            params: { music_id: musicId, count: '20' }, // Daha çox çəkirik ki, süzgəcdən keçirək
            headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': RAPID_HOST }
        });
        
        const now = Math.floor(Date.now() / 1000);
        const videos = response.data.data.videos || [];

        const viralResults = videos
            .filter(v => v.play_count >= 50000 && v.title) // 50K limit və başlıqsızları sil
            .map(v => {
                const hoursOld = Math.max((now - v.create_time) / 3600, 1);
                const velocity = v.play_count / hoursOld; // Saatlıq izlənmə sürəti
                
                return {
                    title: v.title,
                    play_count: v.play_count,
                    digg_count: v.digg_count,
                    comment_count: v.comment_count,
                    time: new Date(v.create_time * 1000).toLocaleDateString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
                    link: `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`,
                    velocity: velocity,
                    is_hot: velocity > 10000 // Saatda 10k-dan çox izlənirsə partlayıb deməkdir
                };
            })
            .sort((a, b) => b.velocity - a.velocity) // Ən sürətli artanları başa qoy
            .slice(0, 8); // Top 8 video
        
        res.json(viralResults);
    } catch (error) {
        res.status(500).json([]);
    }
});

app.listen(process.env.PORT || 3000);
