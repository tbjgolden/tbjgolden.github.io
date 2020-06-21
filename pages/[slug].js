import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Container from "@/components/container";
import Layout from "@/components/layout";
import Markdown from "@/components/markdown";
import { getLayoutData, getPage, getAllPagesWithSlug } from "@/lib/api";
import Head from "next/head";
import markdownToHtml from "@/lib/markdownToHtml";

export default function Page({ page, layoutData, preview }) {
  const router = useRouter();
  if (!router.isFallback && !page?.slug) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <Layout preview={preview} layoutData={layoutData}>
      <Container>
        {router.isFallback ? (
          <h1>Loading…</h1>
        ) : (
          <article>
            <Head>
              <title>{page.title}</title>
            </Head>
            <Markdown content={page.content} />
          </article>
        )}
      </Container>
    </Layout>
  );
}

export async function getStaticProps({ params, preview = false }) {
  const layoutData = await getLayoutData();
  const data = await getPage(params.slug, preview);
  const content = await markdownToHtml(data?.page?.content ?? "");

  return {
    props: {
      preview,
      layoutData,
      page: {
        ...data?.page,
        content,
      },
    },
  };
}

export async function getStaticPaths() {
  const allPages = await getAllPagesWithSlug();
  return {
    paths: allPages?.map((page) => `/${page.slug}`) ?? [],
    fallback: true,
  };
}
