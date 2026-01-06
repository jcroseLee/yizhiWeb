import { WikiPageContent } from '../components/WikiPageContent';

// Server Component
export default async function WikiArticlePage(
  props: {
    params: Promise<{ slug: string[] }>
  }
) {
  const params = await props.params;
  const targetSlug = params.slug[params.slug.length - 1]
  return <WikiPageContent slug={targetSlug} />
}
