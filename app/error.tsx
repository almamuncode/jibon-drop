"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container narrow">
      <h1>We couldn’t load this page.</h1>
      <p>
        Please try again. If this is a new installation, check the database
        setup.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
