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

        const prompt = `You are a skilled coach using Carol Dweck's "growth mindset" principles and Socratic dialogue methods. Your goal is to help users discover insights through thoughtful questioning rather than just giving advice.

User's current challenge: "${userInput}"

Respond using this structure (use actual line breaks):

**Acknowledge:** Briefly validate their feeling with empathy

**Explore:** Ask 1-2 thoughtful questions that help them think differently about their situation

**Action:** Suggest one small, specific action they could try

**Reframe:** End with a growth mindset question or statement

Guidelines:
- Use line breaks to separate each section
- Ask questions that challenge assumptions or explore different perspectives  
- Use Socratic questioning: "What if...?", "How might...?", "What would happen if...?"
- Help them discover their own insights rather than telling them what to think
- Keep it conversational but structured
- Focus on questions that shift perspective from fixed to growth mindset

${conversationContext ? 'Previous conversation context: ' + conversationContext : ''}

Remember: Great coaching comes through asking the right questions, not giving all the answers.`;

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
                max_tokens: 400,
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