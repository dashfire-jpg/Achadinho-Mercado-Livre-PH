import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

async function createServer() {
  const app = express();
  
  app.use(express.json());

  // API Route to scrape product info
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`Scraping URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Remove scripts, styles, and other noise
      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('footer').remove();
      $('iframe').remove();

      // Extract meaningful text
      const title = $('title').text() || $('h1').first().text();
      
      // Try to find the main product image
      let imageUrl = "";
      
      // Mercado Livre specific
      if (url.includes('mercadolivre.com.br')) {
        imageUrl = $('.ui-pdp-gallery__figure__image').first().attr('src') || 
                   $('.ui-pdp-image.ui-pdp-gallery__figure__image').first().attr('src') ||
                   $('img.ui-pdp-image').first().attr('src') ||
                   $('meta[property="og:image"]').attr('content') || 
                   $('.ui-pdp-gallery__figure__image').first().attr('data-zoom') || "";
      } 
      // Shopee specific
      else if (url.includes('shopee.com.br')) {
        imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('img[src*="cv-br"]').first().attr('src') ||
                   $('img.product-featured-image').attr('src') || 
                   $('.product-briefing img').first().attr('src') || "";
      }
      // Amazon specific
      else if (url.includes('amazon.com.br')) {
        imageUrl = $('#landingImage').attr('src') || 
                   $('#imgBlkFront').attr('src') ||
                   $('meta[property="og:image"]').attr('content') || 
                   $('#main-image').attr('src') || "";
      }
      // Generic fallback
      else {
        imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('link[rel="image_src"]').attr('href') || 
                   $('img[src*="product"]').first().attr('src') || 
                   $('img').first().attr('src') || "";
      }

      // Clean up image URL if it's relative
      if (imageUrl && imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl && imageUrl.startsWith('/')) {
        const urlObj = new URL(url);
        imageUrl = urlObj.origin + imageUrl;
      }

      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000); // Limit to 5k chars

      res.json({
        title,
        content: bodyText,
        imageUrl,
        url
      });
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      res.status(500).json({ error: "Failed to fetch URL content" });
    }
  });

  // API Route to get config
  app.get("/api/config", (req, res) => {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    // Filter out placeholder keys
    const isPlaceholder = !key || key === "MY_GEMINI_API_KEY" || key.startsWith("TODO");
    res.json({ 
      geminiApiKey: isPlaceholder ? null : key 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

export const appPromise = createServer();

// Only listen if this file is run directly (not in Vercel or as a module)
const isDirectRun = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server.ts');

if (isDirectRun && !process.env.VERCEL) {
  appPromise.then(app => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
