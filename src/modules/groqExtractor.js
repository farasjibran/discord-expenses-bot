const { Groq } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a financial transaction extractor for a Discord bot.
Your task is to extract structured data from user messages in Indonesian language.

Rules:
1. Detect intent: "create", "delete", or "edit"
2. For CREATE: determine "pemasukan" or "pengeluaran", extract name (max 50 chars) and amount (integer Rupiah)
3. For DELETE: extract jenis and searchPattern (keywords from transaction name)
4. For EDIT: extract jenis, searchPattern (keywords), and harga (new amount)
5. Amount shortcuts: "rb"/"ribu" = ×1000, "jt"/"juta"/"j" = ×1000000
6. Return ONLY valid JSON

Examples:
- "makan siang 25000" → {"intent": "create", "jenis": "pengeluaran", "nama": "makan siang", "harga": 25000}
- "hapus pengeluaran kopi" → {"intent": "delete", "jenis": "pengeluaran", "searchPattern": "kopi"}
- "edit pengeluaran kopi 15000" → {"intent": "edit", "jenis": "pengeluaran", "searchPattern": "kopi", "harga": 15000}
- "ubah pemasukan gaji jadi 5jt" → {"intent": "edit", "jenis": "pemasukan", "searchPattern": "gaji", "harga": 5000000}
- "ganti harga boncabe 10rb" → {"intent": "edit", "jenis": "pengeluaran", "searchPattern": "boncabe", "harga": 10000}
- "gaji 5jt" → {"intent": "create", "jenis": "pemasukan", "nama": "gaji", "harga": 5000000}

If ambiguous, return: {"error": "ambiguous", "reason": "description"}`;

async function extractTransaction(rawMessage) {
  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content);

    if (result.error) {
      return { success: false, reason: result.reason, raw: rawMessage };
    }

    const intent = result.intent || 'create';

    if (intent === 'delete') {
      if (!result.jenis || !result.searchPattern) {
        return { success: false, reason: 'missing jenis or searchPattern for delete', raw: rawMessage };
      }
      return {
        success: true,
        intent: 'delete',
        jenis: result.jenis,
        searchPattern: result.searchPattern.trim()
      };
    }

    if (intent === 'edit') {
      if (!result.jenis || !result.searchPattern || !result.harga) {
        return { success: false, reason: 'missing jenis, searchPattern, or harga for edit', raw: rawMessage };
      }
      return {
        success: true,
        intent: 'edit',
        jenis: result.jenis,
        searchPattern: result.searchPattern.trim(),
        harga: parseInt(result.harga)
      };
    }

    if (intent === 'create') {
      if (!result.jenis || !result.nama || !result.harga) {
        return { success: false, reason: 'missing jenis, nama, or harga for create', raw: rawMessage };
      }
      return {
        success: true,
        intent: 'create',
        jenis: result.jenis,
        nama: result.nama.trim(),
        harga: parseInt(result.harga)
      };
    }

    return { success: false, reason: 'unknown intent', raw: rawMessage };
  } catch (err) {
    console.error('Groq extraction error:', err.message);
    return { success: false, reason: 'AI extraction failed', raw: rawMessage };
  }
}

async function detectCategory(transactionName, jenis, existingCategories) {
  const categoryList = existingCategories.map(c => c.name).join(', ');
  
  const categoryPrompt = `You are a category classifier for financial transactions.

Available categories for ${jenis}:
${categoryList}

Task: Classify the transaction "${transactionName}" into ONE of the existing categories above.
If none fit perfectly, suggest a NEW category name (2-3 words max, in Indonesian).

Return ONLY valid JSON:
- If existing category fits: {"category": "exact category name from list", "isNew": false}
- If need new category: {"category": "new category name", "isNew": true}

Examples:
- "makan siang" with categories ["Makanan & Minuman", "Transportasi"] → {"category": "Makanan & Minuman", "isNew": false}
- "beli baju" with categories ["Makanan & Minuman", "Transportasi"] → {"category": "Belanja", "isNew": true}
- "gaji bulanan" with categories ["Gaji", "Bonus"] → {"category": "Gaji", "isNew": false}`;

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: [
        { role: 'user', content: categoryPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 200
    });

    const result = JSON.parse(completion.choices[0].message.content);

    if (!result.category) {
      return { success: false, reason: 'no category returned' };
    }

    return {
      success: true,
      category: result.category.trim(),
      isNew: result.isNew || false
    };
  } catch (err) {
    console.error('Groq category detection error:', err.message);
    return { success: false, reason: 'AI category detection failed' };
  }
}

module.exports = { extractTransaction, detectCategory };