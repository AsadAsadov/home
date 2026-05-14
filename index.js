const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.use(express.static('public'));

const RAPID_HOST = 'tiktok-scraper7.p.rapidapi.com';
const FEED_REGIONS = ['US', 'TR', 'GB', 'DE', 'AZ'];
const FEED_COUNT_PER_REGION = 30;
const FEED_WINDOW_SEC = 7 * 24 * 60 * 60;

const rapidHeaders = () => ({
    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    'x-rapidapi-host': RAPID_HOST,
});

function engagementRatePercent(v) {
    const views = Number(v.play_count) || 0;
    if (views <= 0) return 0;
    const likes = Number(v.digg_count) || 0;
    const shares = Number(v.share_count) || 0;
    const comments = Number(v.comment_count) || 0;
    return ((likes + shares + comments) / views) * 100;
}

function growthVelocity(v, nowSec) {
    const created = Number(v.create_time) || nowSec;
    const hoursOld = Math.max((nowSec - created) / 3600, 1 / 60);
    return (Number(v.play_count) || 0) / hoursOld;
}

function displayMusicTitle(v) {
    const mi = v.music_info;
    if (!mi) return v.title || 'Naməlum səs';
    let displayTitle = mi.title || 'Naməlum səs';
    if (String(displayTitle).toLowerCase().includes('original sound')) {
        displayTitle = `${mi.author || 'Creator'} (Original)`;
    }
    return displayTitle;
}

function buildVideoUrl(v) {
    const uid = v.author?.unique_id || v.author?.nickname || 'user';
    const vid = v.video_id;
    if (!vid) return '';
    return `https://www.tiktok.com/@${uid}/video/${vid}`;
}

function mapFeedVideoToTrendRow(v, region, nowSec) {
    const velocity = growthVelocity(v, nowSec);
    const er = engagementRatePercent(v);
    const music = v.music_info || {};
    const thumb =
        v.origin_cover ||
        v.cover ||
        music.cover_medium ||
        music.cover_large ||
        v.dynamic_cover ||
        '';

    return {
        trend_type: 'discover_feed',
        trend_name: displayMusicTitle(v),
        trend_id: String(v.video_id),
        music_id: music.id != null ? String(music.id) : null,
        growth_rate: velocity,
        engagement_rate: Number(er.toFixed(4)),
        region,
        trend_reason:
            (Number(v.play_count) || 0) > 1_000_000 ? '🔥 Global Viral' : '📈 Kəşfiyyat artımı',
        thumbnail: thumb,
        author_name: v.author?.unique_id || v.author?.nickname || '',
        video_url: buildVideoUrl(v),
        caption: (v.title && String(v.title).trim()) || '',
        view_count: Number(v.play_count) || 0,
        like_count: Number(v.digg_count) || 0,
        share_count: Number(v.share_count) || 0,
        comment_count: Number(v.comment_count) || 0,
        discovered_at: new Date().toISOString(),
    };
}

async function fetchRegionFeed(region) {
    const res = await axios.get(`https://${RAPID_HOST}/feed/list`, {
        params: { region, count: String(FEED_COUNT_PER_REGION) },
        headers: rapidHeaders(),
        validateStatus: () => true,
    });

    if (res.status === 404) {
        throw new Error(`Feed 404 (${region})`);
    }
    if (res.status === 429) {
        throw new Error(`Rate limit (${region})`);
    }
    if (res.status < 200 || res.status >= 300) {
        throw new Error(`HTTP ${res.status} (${region})`);
    }

    const list = res.data?.data?.videos;
    if (!Array.isArray(list)) {
        throw new Error(`Bozuk cavab (${region})`);
    }
    return list;
}

// ANA SƏHİFƏ
app.get('/', async (req, res) => {
    const regionParam = (req.query.region || 'Global').trim();
    const selectedRegion = regionParam === '' ? 'Global' : regionParam;

    try {
        const { data: videos } = await supabase
            .from('videos')
            .select('*, accounts(username)')
            .order('created_at', { ascending: false })
            .limit(15);

        let trendsQuery = supabase
            .from('global_trends')
            .select('*')
            .order('growth_rate', { ascending: false })
            .limit(60);

        if (selectedRegion && selectedRegion !== 'Global') {
            trendsQuery = trendsQuery.eq('region', selectedRegion);
        }

        const { data: trendsRaw } = await trendsQuery;
        const trends = trendsRaw || [];
        const maxVelocity = Math.max(...trends.map((t) => Number(t.growth_rate) || 0), 1);

        const trendsView = trends.map((t) => ({
            ...t,
            velocity_bar_pct: Math.min(100, ((Number(t.growth_rate) || 0) / maxVelocity) * 100),
            er_display: Number(t.engagement_rate != null ? t.engagement_rate : 0).toFixed(2),
            high_potential: Number(t.engagement_rate || 0) > 5,
        }));

        const videosView = (videos || []).map((v) => {
            const views = Number(v.view_count) || 0;
            const likes = Number(v.like_count) || 0;
            const shares = Number(v.share_count) || 0;
            const comments = Number(v.comment_count) || 0;
            const er = views > 0 ? ((likes + shares + comments) / views) * 100 : 0;
            return {
                ...v,
                er_display: er.toFixed(2),
                high_potential: er > 5,
            };
        });

        res.render('dashboard', {
            videos: videosView,
            trends: trendsView,
            selectedRegion,
            regionOptions: ['Global', ...FEED_REGIONS],
            flashWarn: typeof req.query.warn === 'string' ? req.query.warn : '',
            flashImported: typeof req.query.imported === 'string' ? req.query.imported : '',
        });
    } catch (err) {
        res.render('dashboard', {
            videos: [],
            trends: [],
            selectedRegion: 'Global',
            regionOptions: ['Global', ...FEED_REGIONS],
            error: err.message,
            flashWarn: typeof req.query.warn === 'string' ? req.query.warn : '',
            flashImported: typeof req.query.imported === 'string' ? req.query.imported : '',
        });
    }
});

// 1. PROFİL ANALİZİ
app.get('/analyze/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const userRes = await axios.get(`https://${RAPID_HOST}/user/info`, {
            params: { unique_id: username },
            headers: rapidHeaders(),
        });

        if (!userRes.data?.data) return res.status(404).send('İstifadəçi tapılmadı.');
        const userObj = userRes.data.data.user;

        const postRes = await axios.get(`https://${RAPID_HOST}/user/posts`, {
            params: { unique_id: username, count: '12' },
            headers: rapidHeaders(),
        });

        const posts = postRes.data.data?.videos || [];

        const { data: account } = await supabase
            .from('accounts')
            .upsert(
                {
                    username,
                    fullname: userObj.nickname,
                },
                { onConflict: 'username' }
            )
            .select()
            .single();

        if (posts.length > 0) {
            const videoData = posts.map((v) => ({
                account_id: account.id,
                tiktok_id: v.video_id,
                caption: v.title || 'Açıqlama yoxdur',
                view_count: v.play_count || 0,
                like_count: v.digg_count || 0,
                share_count: v.share_count || 0,
                comment_count: v.comment_count || 0,
                music_name: v.music_info?.title || 'Səs məlumatı yoxdur',
                video_url: `https://www.tiktok.com/@${username}/video/${v.video_id}`,
                created_at: new Date(v.create_time * 1000).toISOString(),
            }));
            await supabase.from('videos').upsert(videoData, { onConflict: 'tiktok_id' });
        }
        res.redirect('/');
    } catch (error) {
        res.status(500).send('Analiz xətası: ' + error.message);
    }
});

// 2. KƏŞFİYYAT (DISCOVER / FEED) — çoxregionlu
app.get('/fetch-global-trends', async (req, res) => {
    const nowSec = Math.floor(Date.now() / 1000);
    const cutoffCreateTime = nowSec - FEED_WINDOW_SEC;
    const regionErrors = [];
    let totalUpserted = 0;

    for (const region of FEED_REGIONS) {
        try {
            const rawVideos = await fetchRegionFeed(region);
            const filtered = rawVideos.filter(
                (v) => v && v.video_id && v.create_time && v.create_time >= cutoffCreateTime
            );

            const rows = filtered.map((v) => mapFeedVideoToTrendRow(v, region, nowSec));

            if (rows.length === 0) continue;

            const { error } = await supabase.from('global_trends').upsert(rows, {
                onConflict: 'trend_id,region',
            });

            if (error) {
                regionErrors.push(`${region}: ${error.message}`);
                continue;
            }
            totalUpserted += rows.length;
        } catch (e) {
            const msg = e.response?.status
                ? `${region}: HTTP ${e.response.status}`
                : `${region}: ${e.message || 'Naməlum xəta'}`;
            regionErrors.push(msg);
        }
    }

    const q = new URLSearchParams();
    if (regionErrors.length) q.set('warn', regionErrors.slice(0, 5).join(' | '));
    q.set('imported', String(totalUpserted));
    res.redirect('/?' + q.toString());
});

// 3. MUSİQİ ANALİZİ
app.get('/music-trends/:musicId', async (req, res) => {
    try {
        const { musicId } = req.params;
        const response = await axios.get(`https://${RAPID_HOST}/music/posts`, {
            params: { music_id: musicId, count: '15' },
            headers: rapidHeaders(),
        });

        const now = Math.floor(Date.now() / 1000);
        const videos = response.data.data.videos || [];

        const viralResults = videos
            .filter((v) => v.play_count >= 50000 && v.title)
            .map((v) => {
                const hoursOld = Math.max((now - v.create_time) / 3600, 1);
                const velocity = v.play_count / hoursOld;
                const views = Number(v.play_count) || 0;
                const likes = Number(v.digg_count) || 0;
                const shares = Number(v.share_count) || 0;
                const comments = Number(v.comment_count) || 0;
                const er = views > 0 ? ((likes + shares + comments) / views) * 100 : 0;

                return {
                    title: v.title,
                    play_count: v.play_count,
                    digg_count: v.digg_count,
                    time: new Date(v.create_time * 1000).toLocaleDateString('az-AZ'),
                    link: `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`,
                    velocity,
                    is_hot: velocity > 10000,
                    engagement_rate: Number(er.toFixed(2)),
                    high_potential: er > 5,
                };
            })
            .sort((a, b) => b.velocity - a.velocity)
            .slice(0, 8);

        res.json(viralResults);
    } catch (error) {
        res.status(500).json([]);
    }
});

app.listen(process.env.PORT || 3000);
