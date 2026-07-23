interface PlaceholderScreenProps {
  title: string
}

function PlaceholderScreen({ title }: PlaceholderScreenProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500">
          This screen is coming soon. Stay tuned for updates.
        </p>
      </div>
    </div>
  )
}

export default PlaceholderScreen

