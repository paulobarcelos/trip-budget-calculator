import Link from 'next/link';

export default function Home() {
  return (
    <div className="prose lg:prose-xl dark:prose-invert mx-auto">
      <h1 className="text-gray-900 dark:text-gray-100">Trip Budget Calculator</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Welcome to Trip Budget Calculator! This tool helps you manage and split expenses
        during trips where people may join or leave at different dates.
      </p>
      
      <h2 className="text-gray-900 dark:text-gray-100">Getting Started</h2>
      <ol className="text-gray-600 dark:text-gray-300">
        <li>
          <Link href="/setup" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Set up your trip dates</Link>
        </li>
        <li>
          <Link href="/travelers" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Add travelers and their dates</Link>
        </li>
        <li>
          <Link href="/expenses" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Add your expenses</Link>
        </li>
        <li>
          <Link href="/usage" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Track who uses what</Link>
        </li>
        <li>
          <Link href="/budget" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">View the budget summary</Link>
        </li>
      </ol>

      <h2 className="text-gray-900 dark:text-gray-100">Features</h2>
      <ul className="text-gray-600 dark:text-gray-300">
        <li>Handle travelers joining/leaving at different dates</li>
        <li>Track shared and personal expenses</li>
        <li>Support for daily and one-time expenses</li>
        <li>Fair cost splitting based on actual usage</li>
        <li>Currency conversion support</li>
      </ul>
    </div>
  );
}
