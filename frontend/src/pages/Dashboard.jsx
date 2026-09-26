import { Package, AlertTriangle, XCircle, FileDown, FileUp, TrendingUp, ArrowRight } from 'lucide-react';

const kpis = [
  { title: 'Total Products', value: '2,451', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  { title: 'Low Stock', value: '34', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { title: 'Out of Stock', value: '12', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  { title: 'Pending Receipts', value: '8', icon: FileDown, color: 'text-green-600', bg: 'bg-green-50' },
  { title: 'Pending Deliveries', value: '15', icon: FileUp, color: 'text-purple-600', bg: 'bg-purple-50' },
];

const recentMovements = [
  { id: 'MV-1023', product: 'MacBook Pro M2', type: 'Receipt', qty: '+50', date: '2023-10-25', status: 'Completed' },
  { id: 'MV-1024', product: 'Logitech MX Master 3', type: 'Delivery', qty: '-12', date: '2023-10-25', status: 'Completed' },
  { id: 'MV-1025', product: 'Dell UltraSharp 27"', type: 'Internal', qty: '5', date: '2023-10-24', status: 'Pending' },
  { id: 'MV-1026', product: 'Keychron K2', type: 'Delivery', qty: '-3', date: '2023-10-24', status: 'Completed' },
];

const lowStockAlerts = [
  { product: 'USB-C Hub Adapter', sku: 'ACC-042', current: 5, threshold: 20 },
  { product: 'Ergonomic Chair', sku: 'FUR-101', current: 2, threshold: 10 },
  { product: 'HDMI Cable 2m', sku: 'ACC-015', current: 0, threshold: 50 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm">
          Generate Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="card flex items-center p-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${kpi.bg}`}>
                <Icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <div className="card lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Inventory Value Trend</h2>
            <select className="text-sm border-gray-300 rounded-md shadow-sm outline-none p-1 border">
              <option>Last 30 Days</option>
              <option>Last 3 Months</option>
            </select>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-200 min-h-[300px]">
            <div className="text-center text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Chart Visualization (Coming Soon)</p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Low Stock Alerts</h2>
            <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 space-y-4">
            {lowStockAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{alert.product}</p>
                  <p className="text-xs text-gray-500 mt-0.5">SKU: {alert.sku}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${alert.current === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {alert.current} / {alert.threshold}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Movements Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Stock Movements</h2>
          <button className="flex items-center text-blue-600 text-sm font-medium hover:underline">
            View History <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">Reference</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentMovements.map((move, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-blue-600">{move.id}</td>
                  <td className="px-4 py-3 text-gray-900">{move.product}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                      ${move.type === 'Receipt' ? 'bg-green-100 text-green-700' : 
                        move.type === 'Delivery' ? 'bg-purple-100 text-purple-700' : 
                        'bg-blue-100 text-blue-700'}`}
                    >
                      {move.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${move.qty.startsWith('+') ? 'text-green-600' : move.qty.startsWith('-') ? 'text-red-600' : 'text-gray-900'}`}>
                    {move.qty}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{move.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${move.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' : 
                        'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${move.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      {move.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
