interface LoadingStateProps {
  message?: string
}

function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin" />
      </div>

      <p className="text-gray-500 text-center">
        {message}
      </p>
    </div>
  )
}

export default LoadingState
