export default function Loading({ message = 'Loading...' }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="spinner mb-4"></div>
            <p className="text-gray-500">{message}</p>
        </div>
    );
}
