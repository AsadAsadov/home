const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();
// Supabase bağlantısı
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Ana Səhifə
app.get('/', async (req, res) => {
    try {
        const { data: videos, error } = await supabase
            .from('videos')
            .select(`
                *,
                accounts (username)
            `)
            .order('view_count', { ascending: false })
            .limit(20);

        if (error) throw error;
        res.render('dashboard', { videos: videos || [] });
    } catch (err) {
        console.error("Dashboard xətası:", err.message);
        res.render('dashboard', { videos: [] });
    }
});

// Analiz Marşrutu
app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    const rapidKey = process.env.RAPIDAPI_KEY;
    
    try {
        console.log(`🔍 ${username} üçün axtarış başladı...`);
        
        // 1. İstifadəçi məlumatlarını çəkmək
        const userRes = await axios.get('https://tiktok-api23.p.rapidapi.com/api/user/info', {
            params: { user: username }, // Əgər işləməsə buranı uniqueId: username ilə əvəz edərik
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com' 
            }
        });

        // API-dən gələn datanı debug etmək üçün
        const responseData = userRes.data;
        
        // Məlumatın olub-olmadığını yoxlayan daha dözümlü yoxlanış
        if (!responseData || (!responseData.userInfo && !responseData.user)) {
            console.log("⚠️ API-dən boş cavab gəldi:", responseData);
            return res.status(404).send(`"${username}" tapılmadı. API cavabı boşdur. Zəhmət olmasa bir az sonra yoxla.`);
        }

        const userObj = responseData.userInfo ? responseData.userInfo.user : responseData.user;
        const secUid = userObj.secUid;
        
        console.log(`✅ İstifadəçi tapıldı: ${userObj.nickname} (secUid: ${secUid})`);

        // 2. Videoları çəkmək
        const postRes = await axios.get('https://tiktok-api23.p.rapidapi.com/api/user/posts', {
            params: { secUid: secUid, count: '10', cursor: '0' },
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com' 
            }
        });

        const posts = postRes.data.aweme_list || postRes.data.posts || [];
        console.log(`🎬 ${posts.length} ədəd video tapıldı.`);

        // 3. Supabase-ə yazmaq
        // Əvvəlcə hesabı əlavə edirik
        const { data: account, error: accError } = await supabase
            .from('accounts')
            .upsert({ username: username, fullname: userObj.nickname }, { onConflict: 'username' })
            .select()
            .single();

        if (accError) throw accError;

        if (posts.length > 0) {
            const videoData = posts.map(v => ({
                account_id: account.id,
                tiktok_id: v.aweme_id || v.video_id,
                caption: v.desc || "",
                view_count: v.statistics ? (v.statistics.play_count || 0) : 0,
                created_at: new Date((v.create_time || Date.now() / 1000) * 1000).toISOString()
            }));

            const { error: vidError } = await supabase
                .from('videos')
                .upsert(videoData, { onConflict: 'tiktok_id' });
            
            if (vidError) throw vidError;
        }

        res.redirect('/');

    } catch (error) {
        console.error("❌ Xəta baş verdi:");
        if (error.response) {
            console.error("Data:", error.response.data);
            console.error("Status:", error.response.status);
            res.status(error.response.status).send(`API Xətası: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error("Mesaj:", error.message);
            res.status(500).send("Sistem Xətası: " + error.message);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT} portunda aktivdir.`));
