import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  ArrowUpDown,
  LayoutGrid,
  List,
  Repeat,
  ExternalLink,
  Heart,
} from "lucide-react";
import "./PhotocardGallery.css";

/**
 * Photocard Gallery
 *
 * Data lives in: /public/cards.json
 * {
 *   "albums": [
 *     {
 *       "id": "ive-switch",
 *       "releaseYear": 2024,
 *       "releaseDate": "2024-04-29",
 *       "group": "IVE",
 *       "albumName": "IVE SWITCH",
 *       "versions": [
 *         {
 *           "id": "on",
 *           "label": "ON Ver.",
 *           "type": "Ver.",
 *           "order": 1,
 *           "cards": [
 *             {
 *               "id": "ive-switch-on-01",
 *               "idol": "Yujin",
 *               "name": "Yujin 01",
 *               "image": "",
 *               "notes": "",
 *               "owned": 1,
 *               "tradeNote": "Looking to trade for Wonyoung ON ver.",
 *               "salePrice": 5,
 *               "saleNote": "or open to offers"
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ],
 *   "wishlist": {
 *     "canvaUrl": "https://canva.link/...",
 *     "note": "Optional note shown above the Canva link",
 *     "cards": [
 *       { "id": "want-01", "idol": "Wonyoung", "cardName": "Wonyoung ON Ver.", "albumName": "IVE SWITCH", "versionLabel": "ON Ver.", "image": "", "note": "" }
 *     ]
 *   }
 * }
 *
 * Every card here is one you own. Set "tradeNote" and/or "salePrice" (plus an
 * optional "saleNote") on any card to have a small trade/sale tag appear on
 * it — hovering (or tapping, on touch) shows what you're asking for it.
 * Leave both blank and no tag shows up. The Wishlist page pulls from
 * "wishlist" and links out to your Canva board.
 */

const SORT_OPTIONS = [
  { value: "album", label: "Album (A-Z)" },
  { value: "release", label: "Release date" },
  { value: "group", label: "Group (A-Z)" },
  { value: "idol", label: "Idol (A-Z)" },
  { value: "name", label: "Card Name (A-Z)" },
];

function normalize(str) {
  return String(str ?? "").toLowerCase().trim();
}

function flattenAlbums(albums) {
  const flat = [];

  for (const album of albums || []) {
    const versions = [...(album.versions || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    for (const version of versions) {
      for (const card of version.cards || []) {
        flat.push({
          id: card.id,
          idol: card.idol ?? "",
          cardName: card.name ?? "",
          image: card.image ?? "",
          notes: card.notes ?? "",
          group: album.group ?? "",
          albumId: album.id,
          albumName: album.albumName ?? "",
          releaseYear: album.releaseYear ?? null,
          releaseDate: album.releaseDate ?? "",
          versionId: version.id,
          versionLabel: version.label ?? "",
          versionType: version.type ?? "",
          versionOrder: version.order ?? 0,
          owned: Number(card.owned) || 0,
          tradeNote: card.tradeNote ?? "",
          salePrice: card.salePrice ?? null,
          saleNote: card.saleNote ?? "",
        });
      }
    }
  }

  return flat;
}

function uniqueSorted(values) {
  return [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
}

function compareCards(a, b, field) {
  switch (field) {
    case "release": {
      const ar = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const br = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return ar - br || normalize(a.albumName).localeCompare(normalize(b.albumName));
    }
    case "group":
      return (
        normalize(a.group).localeCompare(normalize(b.group)) ||
        normalize(a.albumName).localeCompare(normalize(b.albumName)) ||
        a.versionOrder - b.versionOrder
      );
    case "idol":
      return (
        normalize(a.idol).localeCompare(normalize(b.idol)) ||
        normalize(a.albumName).localeCompare(normalize(b.albumName))
      );
    case "name":
      return normalize(a.cardName).localeCompare(normalize(b.cardName));
    case "album":
    default:
      return (
        normalize(a.albumName).localeCompare(normalize(b.albumName)) ||
        a.versionOrder - b.versionOrder ||
        normalize(a.idol).localeCompare(normalize(b.idol))
      );
  }
}

function TradeOverlay({ card }) {
  const hasInfo = card.tradeNote || card.salePrice != null;
  if (!hasInfo) return null;

  return (
    <div className="trade-overlay">
      {card.tradeNote ? (
        <div className="trade-overlay-row">
          <p className="trade-overlay-label">Looking to trade for</p>
          <p className="trade-overlay-value">{card.tradeNote}</p>
        </div>
      ) : null}
      {card.salePrice != null ? (
        <div className="trade-overlay-row">
          <p className="trade-overlay-label">Looking to sell for</p>
          <p className="trade-overlay-value">
            ${card.salePrice}
            {card.saleNote ? ` — ${card.saleNote}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function CardTile({ card, view, tooltipOpen, onToggleTooltip }) {
  const hasInfo = Boolean(card.tradeNote || card.salePrice != null);

  const image = card.image ? (
    <img src={card.image} alt={`${card.idol} - ${card.albumName} ${card.versionLabel}`} loading="lazy" />
  ) : (
    <div className="card-image-placeholder">No image</div>
  );

  if (view === "list") {
    return (
      <article className="card-row">
        <div className="card-row-image">{image}</div>
        <div className="card-row-info">
          <p className="card-album">{card.albumName}</p>
          <p className="card-version">{card.versionLabel}</p>
          <p className="card-meta">
            {[card.group, card.idol].filter(Boolean).join(" · ")}
            {card.owned > 1 ? ` · have ${card.owned}` : ""}
          </p>
          {hasInfo ? (
            <p className="card-meta">
              <Repeat className="icon-xs" />{" "}
              {[
                card.tradeNote ? `Trade for: ${card.tradeNote}` : "",
                card.salePrice != null ? `For sale: $${card.salePrice}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="card-tile">
      <button
        type="button"
        className={`card-image${hasInfo ? " has-info" : ""}${tooltipOpen ? " open" : ""}`}
        onClick={hasInfo ? onToggleTooltip : undefined}
        disabled={!hasInfo}
        aria-expanded={hasInfo ? tooltipOpen : undefined}
      >
        {image}
        {card.owned > 1 ? <span className="owned-badge">×{card.owned}</span> : null}
        {hasInfo ? (
          <span className="trade-indicator" aria-hidden="true">
            <Repeat className="icon-xs" />
          </span>
        ) : null}
        <TradeOverlay card={card} />
      </button>
      <div className="card-info">
        <p className="card-album">{card.albumName}</p>
        <p className="card-version">{card.versionLabel}</p>
      </div>
    </article>
  );
}

function WishlistPage({ wishlist }) {
  const cards = wishlist?.cards ?? [];

  return (
    <main className="gallery">
      <header className="gallery-header">
        <p className="eyebrow">
          <Heart className="icon-sm" />
          Wishlist
        </p>
        <h1>My high ISO cards</h1>
        {wishlist?.note ? <p className="gallery-subtitle">{wishlist.note}</p> : null}

        {wishlist?.canvaUrl ? (
          <a
            className="canva-link"
            href={wishlist.canvaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="icon-sm" />
            Open full wishlist on Canva
          </a>
        ) : null}
      </header>

      {cards.length === 0 ? (
        <div className="state-panel">
          <p className="state-title">No cards listed here yet.</p>
          <p>Check the Canva board above for the current wishlist.</p>
        </div>
      ) : (
        <section className="card-grid">
          {cards.map((card) => (
            <article className="card-tile" key={card.id}>
              <div className="card-image">
                {card.image ? (
                  <img src={card.image} alt={`${card.idol} - ${card.cardName}`} loading="lazy" />
                ) : (
                  <div className="card-image-placeholder">No image</div>
                )}
              </div>
              <div className="card-info">
                <p className="card-album">{card.albumName || card.cardName}</p>
                {card.versionLabel ? <p className="card-version">{card.versionLabel}</p> : null}
                {card.note ? <p className="card-meta">{card.note}</p> : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default function PhotocardGallery() {
  const [page, setPage] = useState(() =>
    window.location.hash === "#wishlist" ? "wishlist" : "collection"
  );
  const [allCards, setAllCards] = useState([]);
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [idolFilter, setIdolFilter] = useState("");
  const [albumFilter, setAlbumFilter] = useState("");
  const [versionFilter, setVersionFilter] = useState("");
  const [tradeableOnly, setTradeableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("album");
  const [sortReverse, setSortReverse] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState("grid");
  const [openTooltipId, setOpenTooltipId] = useState(null);

  useEffect(() => {
    function onHashChange() {
      setPage(window.location.hash === "#wishlist" ? "wishlist" : "collection");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function goTo(nextPage) {
    window.location.hash = nextPage === "wishlist" ? "#wishlist" : "#collection";
    setPage(nextPage);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCards() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${import.meta.env.BASE_URL}cards.json`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Unable to load cards.json (${response.status})`);
        }

        const data = await response.json();
        const albums = Array.isArray(data) ? data : data.albums;

        if (!Array.isArray(albums)) {
          throw new Error('cards.json must have an "albums" array');
        }

        if (!cancelled) {
          setAllCards(flattenAlbums(albums));
          setWishlist(Array.isArray(data) ? null : data.wishlist ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load cards");
          setAllCards([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCards();
    return () => {
      cancelled = true;
    };
  }, []);

  const allGroups = useMemo(() => uniqueSorted(allCards.map((c) => c.group)), [allCards]);
  const allIdols = useMemo(() => uniqueSorted(allCards.map((c) => c.idol)), [allCards]);
  const allAlbums = useMemo(() => uniqueSorted(allCards.map((c) => c.albumName)), [allCards]);
  const allVersions = useMemo(() => uniqueSorted(allCards.map((c) => c.versionLabel)), [allCards]);

  const filteredCards = useMemo(() => {
    const q = normalize(search);
    const gf = normalize(groupFilter);
    const idf = normalize(idolFilter);
    const af = normalize(albumFilter);
    const vf = normalize(versionFilter);

    const matches = allCards.filter((card) => {
      const haystack = [
        card.cardName,
        card.idol,
        card.group,
        card.albumName,
        card.versionLabel,
        card.versionType,
        card.notes,
      ]
        .map(normalize)
        .join(" | ");

      const searchMatch = !q || haystack.includes(q);
      const groupMatch = !gf || normalize(card.group) === gf;
      const idolMatch = !idf || normalize(card.idol) === idf;
      const albumMatch = !af || normalize(card.albumName) === af;
      const versionMatch = !vf || normalize(card.versionLabel) === vf;
      const tradeableMatch = !tradeableOnly || card.tradeNote || card.salePrice != null;

      return searchMatch && groupMatch && idolMatch && albumMatch && versionMatch && tradeableMatch;
    });

    const sorted = [...matches].sort((a, b) => compareCards(a, b, sortBy));
    return sortReverse ? sorted.reverse() : sorted;
  }, [allCards, search, groupFilter, idolFilter, albumFilter, versionFilter, tradeableOnly, sortBy, sortReverse]);

  function clearFilters() {
    setSearch("");
    setGroupFilter("");
    setIdolFilter("");
    setAlbumFilter("");
    setVersionFilter("");
    setTradeableOnly(false);
    setSortBy("album");
    setSortReverse(false);
  }

  const nav = (
    <div className="page-nav">
      <button
        type="button"
        className={page === "collection" ? "active" : ""}
        onClick={() => goTo("collection")}
      >
        My Collection
      </button>
      <button
        type="button"
        className={page === "wishlist" ? "active" : ""}
        onClick={() => goTo("wishlist")}
      >
        Wishlist
      </button>
    </div>
  );

  if (page === "wishlist") {
    return (
      <>
        {nav}
        <WishlistPage wishlist={wishlist} />
      </>
    );
  }

  return (
    <>
      {nav}
      <main className="gallery">
        <header className="gallery-header">
          <p className="eyebrow">
            <SlidersHorizontal className="icon-sm" />
            Photocard Collection
          </p>
          <h1>Showcase your photocards by release, group, and idol</h1>
          <p className="gallery-subtitle">
            Every card below is one I own. Hover or tap{" "}
            <span className="inline-tag">
              <Repeat className="icon-xs" /> Trade / sell info
            </span>{" "}
            on a card to see what I'm asking for it. If you are interested in trading for something I have you can also{" "}
            <a href="#wishlist" onClick={() => goTo("wishlist")}>
              check my wishlist
            </a>
            .
          </p>

          <button
            type="button"
            className="toggle-filters-btn"
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? <ChevronUp className="icon-sm" /> : <ChevronDown className="icon-sm" />}
            {showFilters ? "Hide filters" : "Show filters"}
          </button>
        </header>

        {showFilters ? (
          <section className="filters-panel">
            <label className="search-field">
              <Search className="icon-sm search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards, albums, versions, idols..."
              />
            </label>

            <label className="tradeable-toggle">
              <input
                type="checkbox"
                checked={tradeableOnly}
                onChange={(e) => setTradeableOnly(e.target.checked)}
              />
              Only show cards available to trade or buy
            </label>

            <div className="filters-row">
              <label className="filter-field">
                <span>Group</span>
                <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
                  <option value="">All groups</option>
                  {allGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Idol</span>
                <select value={idolFilter} onChange={(e) => setIdolFilter(e.target.value)}>
                  <option value="">All idols</option>
                  {allIdols.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Album</span>
                <select value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)}>
                  <option value="">All albums</option>
                  {allAlbums.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Album Ver / Type</span>
                <select value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)}>
                  <option value="">All versions / types</option>
                  {allVersions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Sort by</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setSortReverse((v) => !v)}
                title={sortReverse ? "Descending" : "Ascending"}
                aria-label="Reverse sort order"
              >
                <ArrowUpDown className="icon-sm" />
              </button>
            </div>

            <button type="button" className="clear-filters-btn" onClick={clearFilters}>
              <RotateCcw className="icon-sm" />
              Clear filters
            </button>
          </section>
        ) : null}

        <div className="results-bar">
          <p className="results-count">{filteredCards.length} cards</p>
          <div className="view-toggle">
            <button
              type="button"
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="icon-sm" />
            </button>
            <button
              type="button"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="icon-sm" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="state-panel">Loading photocards...</div>
        ) : error ? (
          <div className="state-panel state-error">
            <AlertCircle className="icon-sm" />
            <div>
              <h2>Could not load cards.json</h2>
              <p>{error}</p>
              <p>
                Make sure the file exists at <code>public/cards.json</code>.
              </p>
            </div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="state-panel">
            <p className="state-title">No photocards match your filters.</p>
            <p>Try clearing your search or removing a filter.</p>
          </div>
        ) : (
          <section
            className={view === "grid" ? "card-grid" : "card-list"}
            onMouseLeave={() => setOpenTooltipId(null)}
          >
            {filteredCards.map((card, index) => {
              const key = card.id ?? `${card.albumId}-${card.versionId}-${index}`;
              return (
                <CardTile
                  key={key}
                  card={card}
                  view={view}
                  tooltipOpen={openTooltipId === key}
                  onToggleTooltip={() => setOpenTooltipId((cur) => (cur === key ? null : key))}
                />
              );
            })}
          </section>
        )}
      </main>
    </>
  );
}