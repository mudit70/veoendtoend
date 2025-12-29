import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to VeoEndToEnd
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        Discover client operations from your documentation and generate visual
        end-to-end flow diagrams automatically using AI.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-3xl mb-3">1</div>
          <h3 className="font-semibold text-lg mb-2">Upload Documents</h3>
          <p className="text-gray-600 text-sm">
            Upload your technical documentation, API specs, and design docs.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-3xl mb-3">2</div>
          <h3 className="font-semibold text-lg mb-2">Discover Operations</h3>
          <p className="text-gray-600 text-sm">
            AI analyzes your docs to discover client operations and user interactions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-3xl mb-3">3</div>
          <h3 className="font-semibold text-lg mb-2">Generate Diagrams</h3>
          <p className="text-gray-600 text-sm">
            Generate and customize visual end-to-end flow diagrams for each operation.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <Link
          to="/projects"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
