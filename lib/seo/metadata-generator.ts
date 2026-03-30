import { Metadata } from 'next';
import { getRequiredSiteUrl } from '@/lib/site-config';

interface MetadataConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  tags?: string[];
  noIndex?: boolean;
  canonical?: string;
}

const baseUrl = getRequiredSiteUrl();

const defaultKeywords = [
  'Flotick',
  'flotick',
  'Flotick work management platform',
  'work management Flotick',
  'Flotick work management',
  'Flotick task management',
  'Flotick project management',
  'task management system',
  'project management software',
  'sprint planning tool',
  'agile management',
  'team collaboration',
  'productivity tool',
  'work management system',
  'kanban board',
  'scrum management',
  'attendance tracking',
  'team productivity',
];

/**
 * Generate optimized metadata for any page
 * Ensures consistent SEO across the entire application
 */
export function generateMetadata(config: MetadataConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = '/opengraph-image.png',
    type = 'website',
    publishedTime,
    modifiedTime,
    authors,
    section,
    tags,
    noIndex = false,
    canonical,
  } = config;

  // Combine page-specific keywords with default keywords
  const allKeywords = [...new Set([...keywords, ...defaultKeywords])];

  // Build full title with Flotick branding
  const fullTitle = title.includes('Flotick') ? title : `${title} | Flotick`;

  // Build canonical URL
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : undefined;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: authors?.map(name => ({ name })) || [{ name: 'Flotick Team' }],
    creator: 'Flotick',
    publisher: 'Flotick',
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      type: type === 'product' ? 'website' : type, // OpenGraph only supports website/article
      locale: 'en_US',
      url: canonicalUrl || baseUrl,
      title: fullTitle,
      description,
      siteName: 'Flotick',
      images: [
        {
          url: image.startsWith('http') ? image : `${baseUrl}${image}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors && type === 'article' && { authors }),
      ...(section && type === 'article' && { section }),
      ...(tags && type === 'article' && { tags }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      creator: '@flotick',
      images: [image.startsWith('http') ? image : `${baseUrl}${image}`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };

  return metadata;
}

/**
 * Generate metadata for blog posts
 */
export function generateBlogMetadata({
  title,
  description,
  slug,
  keywords = [],
  publishedTime,
  modifiedTime,
  author = 'Flotick Team',
  image,
  tags = [],
}: {
  title: string;
  description: string;
  slug: string;
  keywords?: string[];
  publishedTime: string;
  modifiedTime?: string;
  author?: string;
  image?: string;
  tags?: string[];
}): Metadata {
  return generateMetadata({
    title,
    description,
    keywords: [
      ...keywords,
      'Flotick blog',
      'work management tips',
      'productivity insights',
    ],
    image: image || '/opengraph-image.png',
    type: 'article',
    publishedTime,
    modifiedTime: modifiedTime || publishedTime,
    authors: [author],
    section: 'Blog',
    tags,
    canonical: `/blog/${slug}`,
  });
}

/**
 * Generate metadata for FAQ page
 */
export function generateFAQMetadata(): Metadata {
  return generateMetadata({
    title: 'Flotick FAQ - Frequently Asked Questions',
    description:
      'Find answers to common questions about Flotick work management system. Learn about features, pricing, integrations, and how to get started with Flotick.',
    keywords: [
      'Flotick FAQ',
      'Flotick questions',
      'Flotick help',
      'Flotick support',
      'work management FAQ',
      'task management questions',
    ],
    canonical: '/faq',
  });
}

/**
 * Generate metadata for features page
 */
export function generateFeaturesMetadata(): Metadata {
  return generateMetadata({
    title: 'Flotick Features - Complete Work Management Solution',
    description:
      'Explore Flotick powerful features: sprint planning, task management, attendance tracking, team collaboration, real-time analytics, and more. Everything your team needs in one platform.',
    keywords: [
      'Flotick features',
      'work management features',
      'sprint planning',
      'task tracking',
      'attendance management',
      'team collaboration tools',
    ],
    canonical: '/features',
  });
}
