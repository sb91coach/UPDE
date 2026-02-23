export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  console.log("UUID:", id)

  return <div>ID: {id}</div>
}