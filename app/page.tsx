export default function Home() {
  return (
    <main style={{ padding: 60, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: 20 }}>
        Pathfinder OS
      </h1>

      <p style={{ fontSize: "1.2rem", maxWidth: 600, marginBottom: 30 }}>
        A Human Performance Intelligence Platform that generates adaptive
        training programmes through guided interaction.
      </p>

      <a
        href="/intake"
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "black",
          color: "white",
          textDecoration: "none",
          borderRadius: 6,
        }}
      >
        Build Your Programme
      </a>
    </main>
  );
}