import { Heart } from "lucide-react";
export default function Loading() {
  return (
    <div className="purchase-page wishlist-page">
      <div className="purchase-shell wishlist-shell">
        <header className="wishlist-heading">
          <span className="wishlist-heading-icon">
            <Heart size={29} strokeWidth={1.3} aria-hidden="true" />
          </span>
          <h1>My Favourites</h1>
          <p role="status">Preparing your edit...</p>
        </header>
        <div className="wishlist-panel" aria-busy="true">
          <div className="wishlist-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="wishlist-skeleton" key={index}>
                <div />
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
