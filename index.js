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
            .limit(10);
        res.render('dashboard', { videos: videos || [] });
    } catch (err) {
        res.send("Xəta: " + err.message);
    }
});

app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    const rapidKey = process.env.RAPIDAPI_KEY;
    try {
        const userRes = await axios.get('https://tiktok-api23.p.rapidapi.com/api/user/info', {
            params: { user: username },
            headers: { 'x-rapidapi-key': rapidKey, 'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com' }
        });
        const secUid = userRes.data.userInfo.user.secUid;
        const postRes = await axios.get('https://tiktok-api23.p.rapidapi.com/api/user/oldest-posts', {
            params: { secUid: secUid, count: '15' },
            headers: { 'x-rapidapi-key': rapidKey, 'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com' }
        });
        const posts = postRes.data.posts;
        const { data: account } = await supabase.from('accounts').upsert({ username: username }).select().single();
        const videoData = posts.map(v => ({
            account_id: account.id,
            tiktok_id: v.aweme_id,
            caption: v.desc,
            view_count: v.statistics.play_count,
            created_at: new Date(v.create_time * 1000).toISOString()
        }));
        await supabase.from('videos').upsert(videoData, { onConflict: 'tiktok_id' });
        res.redirect('/');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Port: ${PORT}`));
