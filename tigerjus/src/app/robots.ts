import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/dashboard', '/plataforma', '/checkout'],
    },
    sitemap: 'https://tigerjus.com.br/sitemap.xml',
  }
}
