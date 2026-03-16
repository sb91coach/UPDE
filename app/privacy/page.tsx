"use client";

export default function PrivacyPage() {
  return (
    <div
      style={{
        background: "#0a0c12",
        minHeight: "100vh",
        color: "rgba(238,240,244,0.9)",
        fontFamily: "-apple-system, sans-serif",
        padding: "48px 24px",
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(238,240,244,0.3)",
        }}
      >
        Human Performance Group
      </p>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-1px",
          margin: "12px 0 8px",
        }}
      >
        Privacy Policy
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "rgba(238,240,244,0.3)",
          marginBottom: 32,
        }}
      >
        Last updated: March 2026
      </p>
      <hr
        style={{
          border: "none",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 40,
        }}
      />

      {[
        {
          title: "Who we are",
          body: "Human Performance Group operates Performance Pathfinder OS, an AI-driven performance coaching platform based in the United Kingdom. Contact: sbrindle91@icloud.com",
        },
        {
          title: "What data we collect",
          body: "Account data (email, name), performance data (readiness scores, training logs, check-in responses, session completions), health and biometric data if a wearable is connected (HRV, sleep, resting heart rate, recovery, strain), usage data, and device data.",
        },
        {
          title: "Why we collect it",
          body: "To deliver personalised training programmes and readiness recommendations, to adapt programming based on check-in and wearable data, and to improve the platform. We do not use your data for advertising. We do not sell your data to third parties.",
        },
        {
          title: "Wearable and third-party data",
          body: "If you connect a Garmin or Whoop device, we receive health and activity data via their developer APIs. This data is stored securely and used solely to inform your performance recommendations. You can disconnect at any time from Settings, which stops future data collection and removes stored tokens.",
        },
        {
          title: "Data storage and security",
          body: "Your data is stored in Supabase, a secure cloud database provider. All data is encrypted in transit (TLS) and at rest. We retain your data for as long as your account is active. You may request deletion at any time.",
        },
        {
          title: "Your rights (UK GDPR)",
          body: "Under UK GDPR you have the right to access, correct, delete, restrict, or port your personal data. To exercise any of these rights contact sbrindle91@icloud.com. We will respond within 30 days.",
        },
        {
          title: "Cookies",
          body: "We use only essential cookies required for authentication and session management. We do not use tracking or advertising cookies.",
        },
        {
          title: "Children",
          body: "This platform is not intended for users under 16. We do not knowingly collect data from children.",
        },
        {
          title: "Changes to this policy",
          body: "We may update this policy as the platform evolves. The current version is always available at this URL.",
        },
        {
          title: "Contact",
          body: "Human Performance Group · sbrindle91@icloud.com · United Kingdom",
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 40 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(238,240,244,0.9)",
              marginBottom: 10,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(238,240,244,0.6)",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {body}
          </p>
        </div>
      ))}

      <a
        href="/profile"
        style={{
          color: "rgba(238,240,244,0.3)",
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        ← Back to app
      </a>
    </div>
  );
}

