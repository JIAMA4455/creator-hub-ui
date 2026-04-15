export default async function handler(req, res) {
    // 1. Настройка CORS (чтобы GitHub Pages мог делать сюда запросы)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Получение юзернейма из запроса (например: ?username=mrbeast)
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    // Очищаем юзернейм от @
    const cleanUsername = username.replace(/^@/, '');

    // 3. Твой секретный API-ключ Scrapeless (берётся из переменных окружения Vercel)
    const SCRAPELESS_TOKEN = process.env.SCRAPELESS_API_KEY;

    if (!SCRAPELESS_TOKEN) {
        return res.status(500).json({ error: 'API key is missing on server' });
    }

    try {
        // 4. Запрос к Scrapeless API (TikTok User Profile)
        const response = await fetch('https://api.scrapeless.com/api/v1/scraper/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': SCRAPELESS_TOKEN
            },
            body: JSON.stringify({
                actor: "scraper.tiktok.webProfile", // Правильный актор для профиля
                input: {
                    username: cleanUsername
                }
            })
        });

        const data = await response.json();

        if (!response.ok || !data.data) {
            console.error("Scrapeless error:", data);
            return res.status(500).json({ error: 'Failed to fetch data from Scrapeless', details: data });
        }

        const profile = data.data;

        // 5. Высчитываем ER (Вовлеченность) по последним видео (если они есть)
        let er = '0.0%';
        if (profile.itemList && profile.itemList.length > 0) {
            let totalViews = 0;
            let totalEngagements = 0;
            
            profile.itemList.forEach(video => {
                totalViews += video.stats.playCount;
                totalEngagements += (video.stats.diggCount + video.stats.commentCount + video.stats.shareCount);
            });

            if (totalViews > 0) {
                er = ((totalEngagements / totalViews) * 100).toFixed(1) + '%';
            }
        }

        // 6. Формируем чистый красивый ответ для нашего сайта
        const cleanData = {
            followers: formatNumber(profile.userInfo.stats.followerCount),
            likes: formatNumber(profile.userInfo.stats.heartCount),
            videos: profile.userInfo.stats.videoCount,
            er: er,
            avatar: profile.userInfo.user.avatarMedium
        };

        return res.status(200).json(cleanData);

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Вспомогательная функция для красивого формата (1.2m, 45k)
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
}