const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
// Need high payload limit for chunks, 2MB is safe for our chunks
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ limit: '2mb' }));

// In-memory chunk store
// Key: chunkId, Value: { data: string, timestamp: number }
const chunks = new Map();

// Cleanup old chunks every hour (prevent memory leak on free tier)
setInterval(() => {
    const now = Date.now();
    for (const [key, chunk] of chunks.entries()) {
        // Delete chunks older than 24 hours
        if (now - chunk.timestamp > 24 * 60 * 60 * 1000) {
            chunks.delete(key);
        }
    }
}, 60 * 60 * 1000);

app.get('/', (req, res) => {
    res.send('DecentraChat Custom Media Relay Server is running.');
});

// Upload a chunk
app.post('/upload/:chunkId', (req, res) => {
    const { chunkId } = req.params;
    let data = req.body;

    if (typeof req.body === 'object' && req.body.data) {
        data = req.body.data;
    }

    if (!data) {
        return res.status(400).json({ error: 'No data provided' });
    }

    // Optional: Max store limit to protect RAM (e.g., max 1000 chunks)
    if (chunks.size > 5000) {
        // Delete oldest
        const oldestKey = chunks.keys().next().value;
        chunks.delete(oldestKey);
    }

    chunks.set(chunkId, {
        data: data,
        timestamp: Date.now()
    });

    res.json({ success: true, message: 'Chunk stored' });
});

// Fetch a chunk
app.get('/fetch/:chunkId', (req, res) => {
    const { chunkId } = req.params;
    const chunk = chunks.get(chunkId);

    if (!chunk) {
        return res.status(404).json({ error: 'Chunk not found or expired' });
    }

    res.json({ success: true, data: chunk.data });
});

app.listen(PORT, () => {
    console.log(`Relay server running on port ${PORT}`);
});
