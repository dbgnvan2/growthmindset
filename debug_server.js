app.post('/api/coach', async (req, res) => {
    try {
        console.log('=== NEW REQUEST ===');
        const { userInput, conversationContext } = req.body;
        console.log('User input:', userInput);
        console.log('API Key present:', CLAUDE_API_KEY ? 'YES' : 'NO');
        console.log('API Key starts with sk-ant:', CLAUDE_API_KEY?.startsWith('sk-ant'));
        
        const prompt = `Using the concepts of "growth mindset" by Carol Dweck, respond to the user's input: "${userInput}"

I want you to craft an encouraging but practical, action-oriented, growth mindset response. It should have something to do and something to think.

Your response should include:
1. Normalize the person's emotion 
2. Suggest a specific behavioral action
3. Include a growth mindset phrase

You are acting as a supportive, friendly coach. Don't make your replies too long.

${conversationContext ? 'Previous conversation context: ' + conversationContext : ''}

Respond naturally as a coach would.`;

        console.log('Making Claude API call...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        console.log('Claude API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Claude API error response:', errorText);
            throw new Error(`Claude API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Claude API success, response length:', data.content[0].text.length);
        
        res.json({ response: data.content[0].text.trim() });
        
    } catch (error) {
        console.error('=== ERROR ===');
        console.error('Error details:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ error: 'Failed to get coaching response: ' + error.message });
    }
});