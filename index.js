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

app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    const rapidKey = process.env.RAPIDAPI_KEY;
    const rapidHost = 'tiktok-scraper7.p.rapidapi.com'; 

    try {
        console.log(`🔍 ${username} yoxlanılır...`);

        // 1. İstifadəçi məlumatlarını çəkmək
        const userRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/info', {
            params: { unique_id: username },
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': rapidHost 
            }
        });

        // Diqqət: Bu API-də data "data" obyektinin içində olur
        if (!userRes.data || !userRes.data.data) {
            return res.status(404).send("İstifadəçi tapılmadı. Adı düzgün yazdığınızdan əmin olun.");
        }

        const userInfo = userRes.data.data.user;
        
        // 2. Videoları çəkmək
        const postRes = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/posts', {
            params: { unique_id: username, count: '10', cursor: '0' },
            headers: { 
                'x-rapidapi-key': rapidKey, 
                'x-rapidapi-host': rapidHost // Burada dırnaqları sildim
            }
        });

        const posts = postRes.data.data ? (postRes.data.data.videos || []) : [];

        // 3. Supabase əməliyyatları
        const { data: account, error: accError } = await supabase
            .from('accounts')
            .upsert({ username: username, fullname: userInfo.nickname }, { onConflict: 'username' })
            .select()
            .single();

        if (accError) throw accError;

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
        console.error("Xəta detalları:", error.response ? error.response.data : error.message);
        res.status(500).send("Xəta baş verdi: " + (error.response ? error.response.status : error.message));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda aktivdir.`));
