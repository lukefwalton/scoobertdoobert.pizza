import '../styles/textonly.css';
import { DESTINATIONS } from '../data/links';

// The genuinely flat fallback. No images, no scripts, no plug-ins — just a
// semantic list of every real destination, driven by the same links.ts source
// as the storefront. This is the accessibility / crawler floor of the site.
export default function TextOnly() {
  return (
    <main className="textonly">
      <h1>Scoobert Doobert &mdash; Text-Only Menu</h1>
      <p>Everything on this site, flat. No images, no scripts, no plug-ins.</p>
      <p>
        <a href="/">&laquo; Back to the Electronic Pizza Storefront</a>
      </p>

      <hr />

      <ul>
        {DESTINATIONS.map((d) => (
          <li key={d.id}>
            <a
              href={d.href}
              {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {d.label}
            </a>
            {d.blurb ? ` — ${d.blurb}` : null}
          </li>
        ))}
      </ul>

      <hr />

      <p>
        Questions or comments?{' '}
        <a href="mailto:webmaster@scoobertdoobert.pizza?subject=Comment%20for%20the%20Webmaster">
          Email the webmaster.
        </a>
      </p>
      <p>
        <small>&copy;1997 Scoobert Doobert, Inc. / The Santa Cruz-ish Operation</small>
      </p>
    </main>
  );
}
