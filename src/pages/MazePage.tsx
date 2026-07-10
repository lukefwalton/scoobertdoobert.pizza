import { Head } from 'vite-react-ssg';
import '../styles/maze.css';
import { mazeNodeBySlug, type MazeGif } from '../data/maze';
import { destById, TEXT_ONLY_PATH } from '../data/links';

// One shell for every back-of-house maze node (ADDENDUM #8). Clones the
// TextOnly shape — a single <main>, one <h1>, its own canonical/OG — so every
// node satisfies the check-build a11y guards by construction. All anchors are
// real hrefs (onward doors are real routes; exits are the sanctioned /?world
// and /?room=ID deep links), fully usable JS-off, zero three.js imports.
//
// Retro furniture: printed GIFs from our own encoder, each with its `-static`
// twin served under prefers-reduced-motion via <picture> (WCAG 2.3.1 — a GIF
// can't be paused in CSS, so the still IS the accommodation).

function Gif({ gif }: { gif: MazeGif }) {
  return (
    <picture>
      <source srcSet={`/gifs/${gif.name}-static.gif`} media="(prefers-reduced-motion: reduce)" />
      <img
        src={`/gifs/${gif.name}.gif`}
        width={gif.width}
        height={gif.height}
        alt={gif.alt}
        {...(gif.alt === '' ? { 'aria-hidden': true } : {})}
      />
    </picture>
  );
}

export default function MazePage({ slug }: { slug: string }) {
  const node = mazeNodeBySlug(slug);
  if (!node) throw new Error(`[maze] unknown maze slug: "${slug}"`);
  const url = `https://www.scoobertdoobert.pizza/${node.slug}`;

  return (
    <main className="maze">
      <Head>
        <title>{`${node.title} — Scoobert Doobert's Basement`}</title>
        <link rel="canonical" href={url} />
        <meta name="description" content={node.description} />
        <meta name="robots" content="index,follow" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={`${node.title} — Scoobert Doobert's Basement`} />
        <meta property="og:description" content={node.description} />
      </Head>

      <p className="maze__crumb">
        <a href="/">&laquo; Electronic Pizza Storefront</a> &middot; somewhere under it
      </p>

      <h1>{node.title}</h1>

      <p className="maze__gif">
        <Gif gif={node.gif} />
      </p>

      <p className="maze__intro">{node.intro}</p>

      <ul className="maze__lore">
        {node.lore.map((line) => (
          <li key={line}>
            <i>&ldquo;{line}&rdquo;</i>
          </li>
        ))}
      </ul>

      <hr />

      {/* The sell — a music or hire link on every node (dead-ends included). */}
      {node.pitch.map(({ destId, lead }) => {
        const d = destById(destId);
        if (!d) return null;
        return (
          <p className="maze__pitch" key={destId}>
            {lead}{' '}
            <a
              href={d.href}
              {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {d.label}
            </a>
          </p>
        );
      })}

      <hr />

      <nav className="maze__doors" aria-label="Doors onward">
        <p className="maze__doors-head">Doors:</p>
        <ul>
          {node.onward.map(({ slug: s, label }) => (
            <li key={s}>
              <a href={`/${s}`}>{label} &raquo;</a>
            </li>
          ))}
          {node.exit && (
            <li className="maze__exit">
              <a href={node.exit.href}>{node.exit.label} &raquo;</a>
            </li>
          )}
        </ul>
      </nav>

      <hr />

      <p className="maze__foot">
        Lost? <a href={TEXT_ONLY_PATH}>Every link, flat (text only)</a> &middot;{' '}
        <a href="/">back to the storefront</a>
      </p>
      <p className="maze__copyright">
        <small>&copy;1997 Scoobert Doobert, Inc. / The San Diego-ish Operation</small>
      </p>
    </main>
  );
}
