import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://tigerjus.com.br'
  const now = new Date()
  return [
    { url: base,               lastModified: now, changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/login`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/checkout`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
