export default function Placeholder({ title }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      
      <div className="card h-96 flex flex-col items-center justify-center text-gray-400 border-dashed border-2">
        <div className="text-lg font-medium mb-2">{title} Module</div>
        <p className="text-sm">This feature will be implemented in the next phase.</p>
      </div>
    </div>
  );
}
