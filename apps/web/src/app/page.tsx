const milestones = [
  "Repository architecture",
  "Application scaffold",
  "Local infrastructure",
  "Database baseline",
  "Runtime baseline",
  "Continuous integration",
];

function BotanicalMark() {
  return (
    <svg
      aria-hidden="true"
      className="botanical-mark"
      viewBox="0 0 300 360"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M145 336c0-82 2-155 19-226M159 184c-22-40-55-59-88-72M161 155c30-44 57-62 86-76"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path d="M141 265c-43-8-69-31-78-70 43 8 69 31 78 70Z" fill="currentColor" />
      <path d="M156 241c39-14 69-8 91 19-39 14-69 8-91-19Z" fill="currentColor" />
      {[
        [64, 108, 36],
        [166, 81, 42],
        [244, 74, 31],
      ].map(([x, y, radius]) => (
        <g className="flower" key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              cx="0"
              cy={-radius * 0.7}
              fill="currentColor"
              key={angle}
              rx={radius * 0.48}
              ry={radius * 0.74}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle cx="0" cy="0" fill="white" r={radius * 0.2} />
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top">
          Orkut Federated
        </a>
        <nav aria-label="Project links">
          <a href="https://github.com/vittorfp/orkut-federated/tree/docs/initial-research-plan/docs/plans">
            Roadmap
          </a>
          <a href="https://github.com/vittorfp/orkut-federated/blob/docs/initial-research-plan/docs/research/orkut-viability.md">
            Research
          </a>
          <a href="https://github.com/vittorfp/orkut-federated/blob/docs/initial-research-plan/CONTRIBUTING.md">
            Contributing
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <h1>
            A social network built around people, not performance<span>.</span>
          </h1>
          <p>
            We are building the foundation for a public, federated place with profiles,
            friendships, communities, scraps, and testimonials.
          </p>
          <a
            className="primary-link"
            href="https://github.com/vittorfp/orkut-federated/tree/docs/initial-research-plan/docs/plans"
          >
            Read the roadmap
          </a>
        </div>
        <div className="illustration">
          <BotanicalMark />
        </div>
      </section>

      <section aria-labelledby="current-build" className="current-build">
        <h2 id="current-build">Current build</h2>
        <p className="phase-name">MVP 0 · Executable foundation</p>
        <p className="phase-summary">
          Tooling, database, health checks, worker boundary, tests, and CI.
        </p>
        <ol className="milestones">
          {milestones.map((milestone, index) => (
            <li key={milestone}>
              <span>{milestone}</span>
              <span aria-hidden="true" className="milestone-line">
                <span style={{ width: `${100 - index * 11}%` }} />
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer>Independent research-stage project · AGPL-3.0</footer>
    </main>
  );
}
