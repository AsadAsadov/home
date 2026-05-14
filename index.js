const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Ana səhifə - Videoları göstər
app.get('/', async (req, res) => {
    try {
        const { data: videos } = await supabase
            .from('videos')
            .select('*, accounts(username)')
            .order('view_count', { ascending: false })
            .limit(20);
        res.render('dashboard', { videos: videos || [] });
    } catch (err) {
        res.render('dashboard', { videos: [] });
    }
});

// Analiz hissəsi - Yeni TikTok Scraper API ilə
app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    const rapidKey = process.env.RAPIDAPI_KEY;
    const rapidHost = 'tiktok-scraper7.p.rapidapi.com'; // Yeni tapdığın host

    try {
        console.log(`${username} üçün məlumatlar çəkilir...`);

        // 1. İstifadəçi məlumatlarını və secUid tapmaq
        const userRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/info', {
            params: { unique_id: username },
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': rapidHost 
            }
        });

        if (!userRes.data || userRes.data.code !== 0) {
            return res.status(404).send("İstifadəçi tapılmadı və ya API xətası.");
        }

        const userInfo = userRes.data.data.user;
        const stats = userRes.data.data.stats;
        
        // 2. Videoları çəkmək
        const postRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/posts', {
            params: { unique_id: username, count: '10', cursor: '0' },
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': 'rapidHost' 
            }
        });

        const posts = postRes.data.data.videos || [];

        // 3. Supabase-ə qeyd etmək
        const { data: account } = await supabase
            .from('accounts')
            .upsert({ 
                username: username, 
                fullname: userInfo.nickname 
            }, { onConflict: 'username' })
            .select()
            .single();

        if (posts.length > 0) {
            const videoData = posts.map(v => ({
                account_id: account.id,
                tiktok_id: v.video_id,
                caption: v.title || "",
                view_count: v.play_count || 0,
                created_at: new Date(v.create_time * 1000).toISOString()
            }));

            await supabase.from('videos').upsert(videoData, { onConflict: 'tiktok_id' });
        }

        res.redirect('/');
    } catch (error) {
        console.error("Xəta:", error.message);
        res.status(500).send("Analiz zamanı xəta baş verdi: " + error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışır.`));
