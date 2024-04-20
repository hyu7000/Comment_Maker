const axios = require('axios');

/**************************************************/
/* Extern Function                                */
/**************************************************/

// openai api 요청
async function fetchOpenAIResponse(prompt, api_key) {
    const headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
    };

    const data = {
        model: "gpt-4", // 또는 "gpt-4-turbo"로 변경 가능
        messages: [{ "role": "system", "content": "Your role is to summarize code comments." }, { "role": "user", "content": prompt }],
    };

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', data, { headers: headers });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
    }
}

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    fetchOpenAIResponse
};