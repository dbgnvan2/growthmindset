export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('=== NEW COACHING REQUEST ===');
        const { userInput, conversationContext } = req.body;
        console.log('User input:', userInput);
        
        const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
        
        if (!CLAUDE_API_KEY) {
            throw new Error('Claude API key not configured');
        }
        
        const prompt = `Using the concepts of "growth mindset" by Carol Dweck, respond to the user's input: "${userInput}"

I want you to craft an encouraging but practical, action-oriented, growth mindset response. It should have something to do and something to think.

Your response should include:
1. Normalize the person's emotion 
2. Suggest a specific behavioral action
3. Include a growth mindset phrase

You are acting as a supportive, friendly coach. Don't make your replies too long.

${conversationContext ? 'Previous conversation context: ' + conversationContext : ''}

Respond naturally as a coach would.`;

        console.log('Calling Claude API...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', errorText);
            throw new Error(`Claude API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.content[0].text.trim();
        
        console.log('Success! Response length:', responseText.length);
        
        res.json({ response: responseText });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to get coaching response', 
            details: error.message 
        });
    }
}