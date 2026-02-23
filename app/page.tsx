export default function Page({ params }: { params: { id: string } }) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Param check</h1>
      <p><b>params.id:</b> {String(params?.id)}</p>
    </main>
  );
}
