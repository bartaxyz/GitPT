import fetch from 'node-fetch';
import { getConfig } from './config.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateCommitMessage(diff: string): Promise<string> {
  const config = getConfig();
  
  if (!config) {
    throw new Error('GitPT is not configured. Please run "gitpt setup" first.');
  }

  const { apiKey, model } = config;

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a helpful assistant that generates concise, informative Git commit messages. 
      Follow conventional commit style. Be brief but descriptive. 
      Focus on WHAT changes were made, WHY they were made, and their IMPACT.
      Use present tense (e.g., "add feature" not "added feature").
      Split the message like this if needed:
      
      feat(scope): short description
      
      More detailed explanation if necessary
      
      Only include a detailed explanation for complex changes.`
    },
    {
      role: 'user',
      content: `Generate a commit message for the following git diff:\n\n${diff}`
    }
  ];

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/bartaxyz/GitPT',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json() as OpenRouterResponse;
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating commit message:', error);
    throw new Error('Failed to generate commit message');
  }
}