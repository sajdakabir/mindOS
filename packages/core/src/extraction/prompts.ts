export const FACT_EXTRACTION_PROMPT = `Extract discrete facts from the following text. Each fact should be a single, standalone statement.

Return a JSON object with this structure:
{
  "facts": [
    {
      "content": "A single factual statement",
      "category": "preference | biographical | contextual | temporal",
      "confidence": 0.0-1.0,
      "temporalRef": "original temporal reference if any, e.g. 'tomorrow', 'next Friday', or null"
    }
  ]
}

Categories:
- preference: User likes, dislikes, preferences (e.g. "prefers dark mode")
- biographical: Personal info (e.g. "name is John", "works at Acme")
- contextual: Current situation/context (e.g. "working on a React project")
- temporal: Time-bound facts (e.g. "has a meeting tomorrow at 3pm")

Rules:
- Extract ONLY factual statements, not opinions or hypotheticals
- Each fact must stand alone without needing the original context
- Confidence should reflect how clearly the fact is stated (explicit = 1.0, implied = 0.5-0.8)
- If no facts can be extracted, return {"facts": []}

Current date: {{currentDate}}

Text:
{{content}}`;

export const CONTRADICTION_DETECTION_PROMPT = `Determine if the new fact contradicts the existing fact.

Existing fact: "{{existingFact}}"
New fact: "{{newFact}}"

Return JSON:
{
  "contradicts": true or false,
  "explanation": "Brief explanation of why they do or don't contradict"
}

A contradiction means the facts cannot both be true simultaneously.
Minor differences or additions are NOT contradictions.
Only flag as contradiction if accepting the new fact means the old one is no longer valid.`;

export const PROFILE_SUMMARY_PROMPT = `Based on the following facts about a user, generate a concise profile summary (2-3 sentences max).

Facts:
{{facts}}

Return JSON:
{
  "summary": "A concise profile summary",
  "name": "The user's name if known, or null",
  "preferences": { "key": "value" pairs of known preferences },
  "traits": ["list", "of", "traits"],
  "currentTopics": ["topics", "they're", "working on"],
  "activeGoals": ["their", "current", "goals"]
}

Only include fields where you have clear evidence from the facts. Use null for unknown fields.`;
