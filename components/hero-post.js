import Date from "./formatted-date";
import CoverImage from "./cover-image";
import Excerpt from "./excerpt";
import Link from "@/components/link";

export default function HeroPost({ title, coverImage, date, excerpt, slug }) {
  return (
    <section className="mab35">
      <div>
        <CoverImage
          title={title}
          responsiveImage={coverImage.responsiveImage}
          slug={slug}
        />
      </div>
      <div>
        <div>
          <h3 className="foszH4">
            <Link as={`/blog/${slug}`} href="/blog/[slug]">
              {title}
            </Link>
          </h3>
          <div>
            <Date className="foszSM" dateString={date} />
          </div>
        </div>
        <div>
          <Excerpt>{excerpt}</Excerpt>
        </div>
      </div>
    </section>
  );
}
