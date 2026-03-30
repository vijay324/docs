/**
 * Schema.org structured data generators
 * Provides JSON-LD markup for various content types
 */
import { getRequiredSiteUrl } from '@/lib/site-config';

const baseUrl = getRequiredSiteUrl();

export interface ArticleSchema {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
  };
  url: string;
  keywords?: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

export interface VideoSchema {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
}

/**
 * Generate Article schema for blog posts
 */
export function generateArticleSchema(data: ArticleSchema) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    image: data.image.startsWith('http') ? data.image : `${baseUrl}${data.image}`,
    datePublished: data.datePublished,
    dateModified: data.dateModified || data.datePublished,
    author: {
      '@type': 'Person',
      name: data.author.name,
      url: data.author.url || baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Flotick',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icon-512.png`,
      },
    },
    url: data.url.startsWith('http') ? data.url : `${baseUrl}${data.url}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.url.startsWith('http') ? data.url : `${baseUrl}${data.url}`,
    },
    ...(data.keywords && { keywords: data.keywords.join(', ') }),
  };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Generate HowTo schema for guides
 */
export function generateHowToSchema({
  name,
  description,
  steps,
  totalTime,
  image,
}: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(image && {
      image: image.startsWith('http') ? image : `${baseUrl}${image}`,
    }),
    ...(totalTime && { totalTime }),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: step.image.startsWith('http')
          ? step.image
          : `${baseUrl}${step.image}`,
      }),
      ...(step.url && {
        url: step.url.startsWith('http') ? step.url : `${baseUrl}${step.url}`,
      }),
    })),
  };
}

/**
 * Generate VideoObject schema
 */
export function generateVideoSchema(data: VideoSchema) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: data.name,
    description: data.description,
    thumbnailUrl: data.thumbnailUrl.startsWith('http')
      ? data.thumbnailUrl
      : `${baseUrl}${data.thumbnailUrl}`,
    uploadDate: data.uploadDate,
    ...(data.duration && { duration: data.duration }),
    ...(data.contentUrl && { contentUrl: data.contentUrl }),
    ...(data.embedUrl && { embedUrl: data.embedUrl }),
  };
}

/**
 * Generate Product schema for pricing pages
 */
export function generateProductSchema({
  name,
  description,
  image,
  offers,
}: {
  name: string;
  description: string;
  image: string;
  offers: {
    name: string;
    price: string;
    priceCurrency: string;
    description?: string;
  }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: image.startsWith('http') ? image : `${baseUrl}${image}`,
    brand: {
      '@type': 'Brand',
      name: 'Flotick',
    },
    offers: offers.map(offer => ({
      '@type': 'Offer',
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      ...(offer.description && { description: offer.description }),
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/pricing`,
    })),
  };
}

/**
 * Generate SearchAction schema for site search
 */
export function generateSearchActionSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
