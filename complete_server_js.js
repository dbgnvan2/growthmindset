const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// Replace with your actual Claude API key
const CLAUDE_API_KEY = 'your-claude-api-key-here';

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

        console.log('Calling Claude API...');
        
        const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
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

        console.log('Claude API status:', apiResponse.status);
        
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Claude API error:', errorText);
            throw new Error(`Claude API returned ${apiResponse.status}: ${errorText}`);
        }

        const data = await apiResponse.json();
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
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        apiKeyConfigured: !!(CLAUDE_API_KEY && CLAUDE_API_KEY !== 'your-claude-api-key-here')
    });
});

app.listen(PORT, () => {
    console.log(`Growth Mindset Coach server running at http://localhost:${PORT}`);
    console.log(`API Key configured: ${!!(CLAUDE_API_KEY && CLAUDE_API_KEY !== 'your-claude-api-key-here')}`);
});