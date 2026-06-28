import type { ReactNode } from 'react';
import { Head } from 'vite-react-ssg';
import '../styles/about.css';
import { destById } from '../data/links';

// ───────────────────────────────────────────────────────────────────────────
// /about/jp — 日本語版「シークレット・レシピ」. The Japanese-language twin of
// /about. The rest of scoobertdoobert.pizza is in English; this is the one page
// that exists in 日本語, so it leans hard on the Japan credits (CHAI, Sub Pop,
// Sony Music Japan, NHK, Fuji TV, さかなのこ, サンレコ) — the part of the story
// that matters most to a Japanese-language reader.
//
// HREFLANG: /about and /about/jp are reciprocal language alternates. Both pages
// declare the same alternate set (en / ja / x-default) so a crawler treats them
// as one document in two languages. The ENTITY GRAPH reuses the canonical @ids
// that live on the lukefwalton.com hub (#scoobert, #lovemusicmore-podcast,
// #apology-audiobook, #person), exactly like /about, so the Japanese page does
// not fork a second set of entities — it's the same creator, described in 日本語.
// ───────────────────────────────────────────────────────────────────────────

// External-link helper: collaborator + platform homes always open in a new tab.
function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function AboutJp() {
  const listen =
    destById('listen')?.href ?? 'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn';
  const catalog = destById('catalog')?.href ?? 'https://scoobertdoobert.bandcamp.com/';
  const lmm = destById('podcast')?.href ?? 'https://lovemusicmore.substack.com/';

  // Verified collaborator / placement homes (shared with the English /about).
  const ext = {
    chai: 'https://www.subpop.com/artists/chai',
    winkTogether: 'https://www.subpop.com/releases/chai/wink_together',
    okame: 'https://manakana.bitfan.id/',
    komagome: 'https://www.komagomefc.com/',
    bed: 'https://bed2052.com/',
    tamtam: 'https://www.youtube.com/channel/UCoMxi0h7K5WQIVRyxh2TZXg',
    otomachi:
      'https://www.songkick.com/festivals/3687082-zaotomati-the-otomachi/id/42121412--the-otomachi-festival-2024',
    three: 'https://www.toos.co.jp/3/',
    otomachiFlyer: 'https://www.instagram.com/p/C-vnLOVSPq-/',
    threeFlyer: 'https://www.instagram.com/p/DBIowJ9SM2s/',
    grizzardGraphics: 'https://lukebrogoitti.myportfolio.com/scoobert-doobert',
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': 'https://www.scoobertdoobert.pizza/about/jp#page',
        name: 'スクーバート・ドゥーバートについて',
        url: 'https://www.scoobertdoobert.pizza/about/jp',
        inLanguage: 'ja',
        isPartOf: { '@id': 'https://www.scoobertdoobert.pizza/#website' },
        about: { '@id': 'https://lukefwalton.com/#scoobert' },
        mainEntity: { '@id': 'https://lukefwalton.com/#scoobert' },
      },
      {
        '@type': 'MusicGroup',
        '@id': 'https://lukefwalton.com/#scoobert',
        name: 'Scoobert Doobert',
        alternateName: 'スクーバート・ドゥーバート',
        description:
          'カリフォルニア州サンディエゴ発の自主制作インディーポップ／チルポップ／ファンク／ローファイ・プロジェクト。300曲近くを自ら作曲・演奏・プロデュース・ミックス。Sub Pop および Sony Music Japan を通じてバンド CHAI をリミックス／プロデュースし、NHKドラマ・フジテレビドラマ・映画作品に楽曲を提供。ポッドキャスト『Love Music More』ホスト、プラトン対話篇の朗読オーディオブックの朗読も手がける。',
        disambiguatingDescription:
          'ルーク・フランシス・ウォルトンの音楽・ポッドキャスト・音声プロジェクト名義。NBAの選手・コーチであるルーク・ウォルトンとは別人。',
        genre: ['indie pop', 'chill pop', 'alt-pop', 'funk', 'lo-fi', 'bedroom pop'],
        foundingDate: '2006',
        foundingLocation: { '@type': 'Place', name: 'San Diego, California' },
        location: { '@type': 'Place', name: 'San Diego, California' },
        recordLabel: { '@id': 'https://lukefwalton.com/#beformer' },
        member: { '@id': 'https://lukefwalton.com/#person' },
        sameAs: [
          'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn',
          'https://music.apple.com/us/artist/scoobert-doobert/1240946356',
          'https://scoobertdoobert.bandcamp.com/',
          'https://www.youtube.com/@scoobertdoobertburrito',
          'https://musicbrainz.org/artist/014129ba-f616-4754-a2a5-22933c639ab0',
          'https://koookooorooo.com/scoobert-doobert',
        ],
      },
      {
        '@type': 'MusicEvent',
        '@id': 'https://www.scoobertdoobert.pizza/#event-otomachi-2024',
        name: 'The Otomachi Festival 2024',
        startDate: '2024-10-14',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: 'Renzō-ji (蓮蔵寺)',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Zaō',
            addressRegion: 'Miyagi',
            addressCountry: 'JP',
          },
        },
        performer: { '@id': 'https://lukefwalton.com/#scoobert' },
      },
      {
        '@type': 'MusicEvent',
        '@id': 'https://www.scoobertdoobert.pizza/#event-three-2024',
        name: 'Scoobert Doobert at Shimokitazawa THREE (LOSS × beformer)',
        startDate: '2024-10-18',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'MusicVenue',
          name: 'Shimokitazawa THREE',
          sameAs: 'https://www.toos.co.jp/3/',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Setagaya',
            addressRegion: 'Tokyo',
            addressCountry: 'JP',
          },
        },
        organizer: { '@id': 'https://lukefwalton.com/#beformer' },
        performer: { '@id': 'https://lukefwalton.com/#scoobert' },
      },
      {
        '@type': 'Person',
        '@id': 'https://lukefwalton.com/#person',
        name: 'Luke Francis Walton',
        alternateName: ['ルーク・フランシス・ウォルトン', 'Luke F. Walton', 'Scoobert Doobert'],
        url: 'https://lukefwalton.com/',
      },
    ],
  };

  return (
    <main className="about" lang="ja">
      <Head>
        <html lang="ja" />
        <title>スクーバート・ドゥーバートについて — Scoobert Doobert</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/about/jp" />
        <link rel="alternate" hrefLang="en" href="https://www.scoobertdoobert.pizza/about" />
        <link rel="alternate" hrefLang="ja" href="https://www.scoobertdoobert.pizza/about/jp" />
        <link rel="alternate" hrefLang="x-default" href="https://www.scoobertdoobert.pizza/about" />
        <meta
          name="description"
          content="スクーバート・ドゥーバート（Scoobert Doobert）＝ルーク・F・ウォルトンの日本での活動。CHAI のリミックス／プロデュース（Sub Pop『WINK TOGETHER』、Sony Music Japan）、NHKドラマ『恋せぬふたり』、映画『さかなのこ』、フジテレビドラマ主題歌、『サンレコ』掲載、2024年10月の来日ライブ（東京・宮城）など。"
        />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/about/jp" />
        <meta property="og:locale" content="ja_JP" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:title" content="スクーバート・ドゥーバートについて" />
        <meta
          property="og:description"
          content="CHAI のリミックス／プロデュース（Sub Pop / Sony Music Japan）、NHKドラマ『恋せぬふたり』、映画『さかなのこ』、フジテレビドラマ主題歌、『サンレコ』掲載、2024年10月の来日ライブ。サンディエゴ発の自主制作音楽プロジェクト。"
        />
        <meta
          property="og:image"
          content="https://www.scoobertdoobert.pizza/press/scoobert-og-card.jpg"
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Head>

      <article className="about__article">
        <p className="about__eyebrow">秘伝のレシピ</p>
        <h1>スクーバート・ドゥーバートについて</h1>

        <p className="about__langswitch">
          <a href="/about" hrefLang="en">
            English version »
          </a>
        </p>

        <figure className="about__portrait">
          <img
            src="/press/scoobert-og.jpg"
            alt="スクーバート・ドゥーバート（ルーク・フランシス・ウォルトン）。顔じゅうにギョロ目のシールを貼り、片手をカメラに向けて上げている。"
            width="320"
            height="320"
          />
        </figure>

        <p className="about__lede">
          <strong>Scoobert Doobert（スクーバート・ドゥーバート）</strong>は、カリフォルニア州
          <strong>サンディエゴ</strong>
          発のローファイ・ハイファイ・ワイファイな音楽プロジェクトです。自主制作のインディーポップ、チルポップ、ファンク、ローファイ——フック、ジョーク、感情、テープのヒスノイズ、ビーチの陽気、インターネット脳、そしてブリトーが好きな人のための宅録ミュージック。
        </p>

        <p>
          ほとんどの楽曲はスクーバート本人が作曲・演奏・プロデュース・録音・ミックスまで一人で手がけています。それが弱点であり、同時にこのプロジェクトの核でもあります。このページでは、その中でも
          <strong>日本での仕事</strong>を中心に紹介します。
        </p>

        <h2>日本との仕事</h2>
        <p>
          日本とのつながりは、シングル <em>I’m an Idiot</em> が Spotify の New Music Friday
          に取り上げられたことから始まりました。これがバンド <Ext href={ext.chai}>CHAI</Ext>{' '}
          との出会いにつながり、Sub Pop のコンピレーション{' '}
          <Ext href={ext.winkTogether}>
            <em>WINK TOGETHER</em>
          </Ext>{' '}
          に収録された <em>Miracle（Scoobert Doobert Remix）</em>（2022年）が生まれました。
        </p>
        <p>
          その後も CHAI との制作は続きます。NHKドラマ『恋せぬふたり』の主題歌{' '}
          <em>WHOLE（まるごと）</em>のプロデュース、映画『さかなのこ』の劇中歌{' '}
          <em>MY DREAM（夢のはなし）</em>のサウンドプロデュース（
          <strong>Sony Music Japan</strong>）など、日本のテレビ・映画作品に楽曲を届けてきました。
        </p>
        <p>
          コラボレーションは CHAI にとどまりません。<Ext href={ext.okame}>OKAME</Ext>、{' '}
          <Ext href={ext.komagome}>KOMAGOME</Ext>、東京のバンド <Ext href={ext.bed}>bed</Ext>
          （そのフジテレビ系ドラマ主題歌をスクーバートが共同プロデュース）、そして{' '}
          <Ext href={ext.tamtam}>Tamtam</Ext>{' '}
          といった日本のアーティストたちと仕事を重ねてきました。スタジオワークは音楽雑誌
          <em>『サウンド＆レコーディング・マガジン（サンレコ）』</em>
          にも掲載されています。楽曲は <strong>Sony Music Japan</strong> / Spotify Japan
          を通じて日本でも配信中です。
        </p>
        <p>
          活動は制作だけにとどまりません。2024年10月には<strong>来日</strong>
          し、2か所でライブを行いました。宮城・蔵王の蓮蔵寺で開かれた音楽フェスティバル{' '}
          <Ext href={ext.otomachi}>ザ・オトマチ（The Otomachi Festival 2024）</Ext>（
          <Ext href={ext.otomachiFlyer}>10月14日</Ext>、いとうせいこう・村松邦男・DJ
          小西康陽らと共演）と、東京・下北沢のライブハウス <Ext href={ext.three}>下北沢THREE</Ext>
          での LOSS × beformer のオールナイト・イベント（<Ext href={ext.threeFlyer}>10月18日</Ext>
          ）です。
        </p>
        <figure className="about__portrait">
          <img
            src="/press/scoobert-tokyo-2024.jpg"
            alt="2024年10月、東京のスクーバート・ドゥーバート。"
            width="1000"
            height="666"
            loading="lazy"
          />
          <figcaption>東京、2024年10月</figcaption>
        </figure>
        <p>
          日本語学習、こうした来日ライブ、そして「良いメロディはパスポートより遠くまで旅できる」という信念——日本との縁は、このプロジェクトの背骨を一本貫いて流れています。
        </p>

        <h2>音楽</h2>
        <p>
          Scoobert Doobert
          がフルタイムの録音プロジェクトになる前、スクーバートは長年プロのミュージシャンとして活動していました。ギタリスト兼ヴォーカリストとして
          The Doobie Brothers のツアーに参加し、Lara Johnston との活動では Gregg Allman
          の前座を務めたこともあります。ツアー生活のあとは制作・エンジニアリング・コラボレーションへと軸足を移し、その経験を
          Scoobert のカタログに注ぎ込んでいきました。
        </p>
        <p>
          アルバムには <em>Big Hug</em>（San Diego Music Award ノミネート作）、<em>KŌAN</em>、{' '}
          <em>Moonlight Beach</em>、<em>MÖB</em>、<em>I</em> などがあります。<em>MÖB</em> と{' '}
          <em>I</em> は、ループ・記憶・カリフォルニア・日本・友情・アイデンティティを巡る全4部作{' '}
          <em>MÖBIUS</em> サイクルの幕開けです。
          <a href={catalog} target="_blank" rel="noopener noreferrer">
            カタログ
          </a>
          は大きく、奇妙で、いまも拡張を続けています——シングル、リミックス、コラボ、デモ、映像作品などを含め、登録楽曲は300曲近くにのぼります。いちばんの入り口は、ともかく
          <a href={listen} target="_blank" rel="noopener noreferrer">
            聴いてみること
          </a>
          です。アルバムのカバーアートとプロジェクト全体のビジュアル・アイデンティティは{' '}
          <Ext href={ext.grizzardGraphics}>Grizzard Graphics</Ext> が手がけています。
        </p>

        <h2>Love Music More</h2>
        <p>
          スクーバートは、音楽の技術・哲学・歴史をめぐるニュースレター兼ポッドキャスト{' '}
          <a href={lmm} target="_blank" rel="noopener noreferrer">
            <em>Love Music More</em>
          </a>{' '}
          のホストも務めています。あらゆるジャンル、あらゆる役割のゲストを迎える、音楽ポッドキャストの上位10%に入る番組です。毎週火曜更新。
        </p>

        <p>
          Scoobert Doobert は、ミュージシャン／プロデューサー{' '}
          <a href="https://lukefwalton.com/" rel="me">
            ルーク・フランシス・ウォルトン（Luke Francis Walton）
          </a>{' '}
          の録音・ポッドキャスト・音声プロジェクト名義です。
        </p>

        <hr />

        <nav className="about__links" aria-label="次に行く場所">
          <a href="/about" hrefLang="en">
            English version »
          </a>
          <a href={listen} target="_blank" rel="noopener noreferrer">
            聴く »
          </a>
          <a href={catalog} target="_blank" rel="noopener noreferrer">
            カタログ »
          </a>
          <a href={lmm} target="_blank" rel="noopener noreferrer">
            Love Music More »
          </a>
          <a href="/links">すべてのリンク »</a>
          <a href="/">« ストアフロントへ戻る</a>
        </nav>
      </article>
    </main>
  );
}
