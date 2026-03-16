export default async (req: any, res: any) => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const isPlaceholder = !key || key === "MY_GEMINI_API_KEY" || key.startsWith("TODO");
  res.json({ 
    geminiApiKey: isPlaceholder ? null : key 
  });
};
