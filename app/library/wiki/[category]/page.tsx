import { WikiPageContent } from '../components/WikiPageContent';

// Server Component
export default async function WikiCategoryPage(
  props: {
    params: Promise<{ category: string }>
  }
) {
  const params = await props.params;
  const targetSlug = params.category
  return <WikiPageContent slug={targetSlug} />
}
