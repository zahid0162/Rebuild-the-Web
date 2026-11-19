export interface HfMessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface HfChatRequest {
  systemInstruction: string;
  prompt: string;
  imagesBase64?: string[];
  preferVision?: boolean;
}

const HF_ROUTER_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';

export function getHuggingFaceToken(): string | undefined {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || undefined;
}

export function extractJsonFromModelText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

async function postHfChat(model: string, token: string, messages: unknown[]): Promise<string> {
  const response = await fetch(HF_ROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 8192,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Hugging Face Qwen (${model}) returned HTTP ${response.status}: ${errBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Hugging Face Qwen (${model}) returned an empty completion.`);
  }
  return content;
}

export async function callHuggingFaceQwen(req: HfChatRequest): Promise<string> {
  const token = getHuggingFaceToken();
  if (!token) {
    throw new Error(
      'HF_TOKEN is not configured in server environment secrets. Add HF_TOKEN in Settings > Secrets to use Hugging Face Qwen models.'
    );
  }

  const coderModel = process.env.HF_CODER_MODEL || 'Qwen/Qwen2.5-Coder-32B-Instruct';
  const visionModel = process.env.HF_VISION_MODEL || 'Qwen/Qwen3-VL-8B-Instruct';

  const hasImages = Boolean(req.imagesBase64 && req.imagesBase64.length > 0);
  const selectedModel = req.preferVision && hasImages ? visionModel : coderModel;

  const userContent: string | HfMessageContentPart[] =
    req.preferVision && hasImages
      ? [
          ...(req.imagesBase64 || []).map((b64) => ({
            type: 'image_url' as const,
            image_url: { url: `data:image/png;base64,${b64}` },
          })),
          { type: 'text' as const, text: req.prompt },
        ]
      : req.prompt;

  const messages = [
    { role: 'system', content: req.systemInstruction },
    { role: 'user', content: userContent },
  ];

  try {
    return await postHfChat(selectedModel, token, messages);
  } catch (err) {
    // If vision model fails or isn't enabled on the user's HF provider, fall back to text-only Qwen coder model
    if (selectedModel !== coderModel) {
      return await postHfChat(coderModel, token, [
        { role: 'system', content: req.systemInstruction },
        { role: 'user', content: req.prompt },
      ]);
    }
    throw err;
  }
}
