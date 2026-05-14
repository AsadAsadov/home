const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();

// Render-də SUPABASE_KEY hissəsinə service_role kopyaladığın üçün 
// bu müştəri (client) bütün RLS qorumalarından avtomatik keçəcək.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.get('/', async (req, res) => {
    try {
        const { data: videos } = await supabase
            .from('videos')
            .select('*, accounts(username)')
            .order('view_count', { ascending: false })
            .limit(20);
        res.render('dashboard', { videos: videos || [] });
    } catch (err) {
        console.error("Dashboard xətası:", err.message);
        res.render('dashboard', { videos: [] });
    }
});

app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    const rapidKey = process.env.RAPIDAPI_KEY;
    const rapidHost = 'tiktok-scraper7.p.rapidapi.com'; 

    try {
        console.log(`🔍 ${username} üçün analiz başladıldı...`);

        // 1. TikTok Scraper API-dən istifadəçi məlumatlarını çəkmək
        const userRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/info', {
            params: { unique_id: username },
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': rapidHost 
            }
        });

        if (!userRes.data || !userRes.data.data) {
            return res.status(404).send("İstifadəçi tapılmadı. Adın düzgünlüyünə əmin olun.");
        }

        const userInfo = userRes.data.data.user;
        
        // 2. Videoları çəkmək
        const postRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/posts', {
            params: { unique_id: username, count: '10', cursor: '0' },
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': rapidHost
            }
        });

        const posts = postRes.data.data ? (postRes.data.data.videos || []) : [];

        // 3. Supabase-ə yazmaq (Artıq service_role olduğu üçün RLS mane olmayacaq)
        const { data: account, error: accError } = await supabase
            .from('accounts')
            .upsert({ 
                username: username, 
                fullname: userInfo.nickname 
            }, { onConflict: 'username' })
            .select()
            .single();

        if (accError) {
            console.error("Accounts cədvəlinə yazarkən xəta:", accError.message);
            throw accError;
        }

        if (posts.length > 0) {
            const videoData = posts.map(v => ({
                account_id: account.id,
                tiktok_id: v.video_id,
                caption: v.title || "",
                view_count: v.play_count || 0,
                created_at: new Date(v.create_time * 1000).toISOString()
            }));

            const { error: vidError } = await supabase
                .from('videos')
                .upsert(videoData, { onConflict: 'tiktok_id' });
            
            if (vidError) console.error("Videos cədvəlinə yazarkən xəta:", vidError.message);
        }

        res.redirect('/');
    } catch (error) {
        console.error("Xəta detalları:", error.response ? error.response.data : error.message);
        res.status(500).send("Analiz zamanı texniki xəta baş verdi.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda aktivdir.`));
