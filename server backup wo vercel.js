const express = require('express');
const cors = require('cors');
// not needed const fetch = require('node-fetch');
const path = require('path');
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY ;

const app = express();
const PORT = 3000;

// Replace with your actual Claude API key

console.log('Raw API Key:', CLAUDE_API_KEY);
console.log('API Key length:', CLAUDE_API_KEY.length);
console.log('API Key starts with sk-ant:', CLAUDE_API_KEY.startsWith('sk-ant'));
console.log('API Key equals placeholder:', CLAUDE_API_KEY === 'your-claude-api-key-here');

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.post('/api/coach', async (req, res) => {
    try {
        console.log('=== NEW COACHING REQUEST ===');
        const { userInput, conversationContext } = req.body;
        console.log('User input:', userInput);
        console.log('Has conversation context:', !!conversationContext);


        // Check API key
        if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your-claude-api-key-here') {
            throw new Error('Claude API key not configured');
        }
        console.log('API Key configured:', CLAUDE_API_KEY.startsWith('sk-ant'));

        const prompt = `Using the concepts of "growth mindset" by Carol Dweck, respond to the user's input: "${userInput}"

I want you to craft an encouraging but practical, action-oriented, growth mindset response. It should have something to do and something to think.

Your response should include:
1. Normalize the person's emotion 
2. Suggest a specific behavioral action
3. Include a growth mindset phrase

You are acting as a supportive, friendly coach. Don't make your replies too long.

${conversationContext ? 'Previous conversation context: ' + conversationContext : ''}

Respond naturally as a coach would.`;

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

        console.log('Claude API status:', response.status);
        console.log('Response type:', typeof response);
        console.log('Response has text method:', typeof response.text === 'function');

        if (!response.ok) {
            let errorText = 'Unknown error';
            try {
                if (typeof response.text === 'function') {
                    errorText = await response.text();
                } else {
                    errorText = `HTTP ${response.status} error`;
                }
            } catch (textError) {
                console.error('Could not read error response:', textError);
                errorText = `HTTP ${response.status} error`;
            }
            console.error('Claude API error:', errorText);
            throw new Error(`Claude API returned ${response.status}: ${errorText}`);
        }
        // next section 
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('Could not parse JSON response:', jsonError);
            throw new Error('Invalid JSON response from Claude API');
        }
        console.log('Claude API raw response:', JSON.stringify(data, null, 2));

        // Safely extract the response text
        let responseText;
        if (data.content && Array.isArray(data.content) && data.content.length > 0) {
            if (data.content[0].text) {
                responseText = data.content[0].text.trim();
            } else if (typeof data.content[0] === 'string') {
                responseText = data.content[0].trim();
            } else {
                throw new Error('Unexpected content structure in Claude response');
            }
        } else if (data.message) {
            responseText = data.message.trim();
        } else if (data.response) {
            responseText = data.response.trim();
        } else {
            console.error('Unexpected API response structure:', data);
            throw new Error('Could not extract response text from Claude API');
        }

        console.log('Extracted response text:', responseText);
        console.log('Response length:', responseText.length);

        res.json({ response: responseText });

    } catch (error) {
        console.error('=== SERVER ERROR ===');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);

        res.status(500).json({
            error: 'Failed to get coaching response',
            details: error.message
        });
    }
}
);

// Debug the boolean logic
console.log('=== API KEY DEBUG ===');
console.log('CLAUDE_API_KEY exists:', !!CLAUDE_API_KEY);
console.log('CLAUDE_API_KEY is not placeholder:', CLAUDE_API_KEY !== 'your-claude-api-key-here');
console.log('Combined check:', !!(CLAUDE_API_KEY && CLAUDE_API_KEY !== 'your-claude-api-key-here'));
console.log('========================');
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        apiKeyConfigured: !!(CLAUDE_API_KEY && CLAUDE_API_KEY !== 'your-claude-api-key-here')
    });
});

// For Vercel deployment
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Add path import at the top if not already there
const path = require('path');


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});