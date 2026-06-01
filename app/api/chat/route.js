import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request) {
  try {
    const body = await request.json()
    const { messages, system } = body

    console.log('API called with messages:', messages?.length)

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      ...(system && { system }),
      messages
    })

    console.log('API response:', response.content[0].text?.slice(0, 50))

    return Response.json({ content: response.content[0].text })

  } catch (error) {
    console.error('API error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}