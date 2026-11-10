import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: "96px 24px", maxWidth: 640, margin: "0 auto", fontFamily: "var(--font-hanken)" }}>
      <h1 style={{ fontFamily: "var(--font-gloock)", fontSize: 48, margin: 0 }}>Page not found</h1>
      <p style={{ marginTop: 16 }}>
        That page does not exist. <Link href="/">Go to the MEILLEUR home page</Link>.
      </p>
    </main>
  );
}
