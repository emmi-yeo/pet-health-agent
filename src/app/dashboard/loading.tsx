export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-14 bg-white border-b border-gray-100 animate-pulse" />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mb-8" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-36 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
