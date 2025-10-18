import { UserList } from "@/components/UserList"
import { UserForm } from "@/components/UserForm"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Next.js + Effect-TS Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A full-stack application showcasing Next.js 15 with App Router on the frontend 
            and Effect-TS with Express.js on the backend. The frontend and backend are 
            completely separated by runtimes.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <UserForm />
          </div>
          <div>
            <UserList />
          </div>
        </div>

        <div className="mt-12 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Architecture Overview</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Frontend (Next.js)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Next.js 15 with App Router</li>
                <li>• TypeScript with strict mode</li>
                <li>• Tailwind CSS for styling</li>
                <li>• React 19 with server components</li>
                <li>• Biome for linting and formatting</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Backend (Effect-TS)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Effect-TS for functional programming</li>
                <li>• Express.js for HTTP handling</li>
                <li>• Layer-based dependency injection</li>
                <li>• Proper error handling with Effect</li>
                <li>• Separate TypeScript compilation</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> To see the full functionality, make sure to start both the frontend 
              (<code className="bg-blue-100 px-1 rounded">npm run dev</code>) and backend 
              (<code className="bg-blue-100 px-1 rounded">npm run dev:backend</code>) servers, 
              or use <code className="bg-blue-100 px-1 rounded">npm run dev:full</code> to start both.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}