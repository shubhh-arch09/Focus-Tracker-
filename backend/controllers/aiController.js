exports.chat = async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'AI service not configured. Set ANTHROPIC_API_KEY in your .env file.' });
    }

    const { message, subject } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = 'You are a helpful study assistant for a focus-tracking application. ' +
        'You help students clear their doubts and understand concepts better. ' +
        'Keep your answers clear, concise, and educational. Use examples when helpful. ' +
        'Format your responses with markdown for better readability.' +
        (subject ? ' The student is currently studying: ' + subject + '.' : '');

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{ role: 'user', content: message }]
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(502).json({ error: err.error?.message || 'AI service error' });
        }

        const data = await response.json();
        const reply = data.content && data.content[0] ? data.content[0].text : 'No response generated.';
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reach AI service' });
    }
};
