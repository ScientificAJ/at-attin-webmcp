import { ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

interface SectionLink {
  label: string;
  to: string;
}

interface SectionIndexPageProps {
  eyebrow: string;
  title: string;
  description: string;
  links?: SectionLink[];
}

export function SectionIndexPage({
  eyebrow,
  title,
  description,
  links = [],
}: SectionIndexPageProps) {
  return (
    <section className="section-index" aria-labelledby="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="section-title">{title}</h1>
      <p className="section-description">{description}</p>
      {links.length > 0 ? (
        <nav className="section-links" aria-label={`${title} sections`}>
          {links.map(({ label, to }) => (
            <Link key={to} to={to}>
              <span>{label}</span>
              <ArrowRight aria-hidden="true" weight="regular" />
            </Link>
          ))}
        </nav>
      ) : (
        <p className="section-ready">This manual banking section is ready for the full product screen.</p>
      )}
    </section>
  );
}
