import axios from "axios";
import * as cheerio from "cheerio";

export default async (req: any, res: any) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    $('iframe').remove();

    const title = $('title').text() || $('h1').first().text();
    
    let imageUrl = "";
    
    if (url.includes('mercadolivre.com.br')) {
      imageUrl = $('.ui-pdp-gallery__figure__image').first().attr('src') || 
                 $('.ui-pdp-image.ui-pdp-gallery__figure__image').first().attr('src') ||
                 $('img.ui-pdp-image').first().attr('src') ||
                 $('meta[property="og:image"]').attr('content') || 
                 $('.ui-pdp-gallery__figure__image').first().attr('data-zoom') || "";
    } else if (url.includes('shopee.com.br')) {
      imageUrl = $('meta[property="og:image"]').attr('content') || 
                 $('img[src*="cv-br"]').first().attr('src') ||
                 $('img.product-featured-image').attr('src') || 
                 $('.product-briefing img').first().attr('src') || "";
    } else if (url.includes('amazon.com.br')) {
      imageUrl = $('#landingImage').attr('src') || 
                 $('#imgBlkFront').attr('src') ||
                 $('meta[property="og:image"]').attr('content') || 
                 $('#main-image').attr('src') || "";
    } else {
      imageUrl = $('meta[property="og:image"]').attr('content') || 
                 $('meta[name="twitter:image"]').attr('content') ||
                 $('link[rel="image_src"]').attr('href') || 
                 $('img[src*="product"]').first().attr('src') || 
                 $('img').first().attr('src') || "";
    }

    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl && imageUrl.startsWith('/')) {
      const urlObj = new URL(url);
      imageUrl = urlObj.origin + imageUrl;
    }

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);

    res.json({
      title,
      content: bodyText,
      imageUrl,
      url
    });
  } catch (error: any) {
    console.error("Scraping error:", error.message);
    res.status(500).json({ 
      error: "Failed to fetch URL content",
      details: error.message 
    });
  }
};
