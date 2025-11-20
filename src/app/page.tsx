import Link from 'next/link';

export default function Home() {
  return (
    <div className="prose lg:prose-xl dark:prose-invert mx-auto">
      <h1 className="text-gray-900 dark:text-gray-100">Trip Budget Planner</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Model your trip before you book it. Enter dates, travelers, and rough costs, then tweak
        assumptions to see how the total and per-person budgets move.
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
          <Link href="/expenses" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Add your expenses and assumptions</Link>
        </li>
        <li>
          <Link href="/usage" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">(Optional) Track who uses what during the trip</Link>
        </li>
        <li>
          <Link href="/budget" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">View the budget summary</Link>
        </li>
      </ol>

      <h2 className="text-gray-900 dark:text-gray-100">Features</h2>
      <ul className="text-gray-600 dark:text-gray-300">
        <li>Plan first: simulate costs per traveler before booking</li>
        <li>Handle travelers joining/leaving at different dates</li>
        <li>Model shared/personal expenses, daily or one-time</li>
        <li>Instant per-day and per-person totals with toggles</li>
        <li>Sharable snapshots and currency display selection</li>
        <li>Export/Import JSON or copy a shareable link from the header at any time</li>
      </ul>
    </div>
  );
}
